"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const serializable_retry_util_1 = require("../common/utils/serializable-retry.util");
const club_benefits_service_1 = require("../modules/club-benefits/club-benefits.service");
const order_expiration_service_1 = require("../modules/order-fulfillment/order-expiration.service");
const order_fulfillment_service_1 = require("../modules/order-fulfillment/order-fulfillment.service");
const tickets_service_1 = require("../modules/tickets/tickets.service");
const databaseUrl = process.env.DATABASE_URL ?? '';
const describeIntegration = process.env.RUN_INTEGRATION === 'true' ? describe : describe.skip;
jest.setTimeout(120_000);
describeIntegration('Clube Outrahora checkout with real PostgreSQL', () => {
    const prefix = `it-club-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const prismaA = new client_1.PrismaClient();
    const prismaB = new client_1.PrismaClient();
    const benefits = new club_benefits_service_1.ClubBenefitsService();
    const mail = { sendOrderConfirmation: jest.fn().mockResolvedValue(undefined) };
    const config = { get: (_key, fallback) => fallback };
    let fixture;
    beforeAll(async () => {
        if (!databaseUrl.includes('127.0.0.1:55432/outrahora_test')) {
            throw new Error('Integration tests refuse to run outside the temporary outrahora_test database');
        }
        fixture = await createFixture();
    });
    afterAll(async () => {
        const events = await prismaA.event.findMany({ where: { slug: { startsWith: prefix } }, select: { id: true } });
        const eventIds = events.map(({ id }) => id);
        if (eventIds.length) {
            await prismaA.clubBenefitUsage.deleteMany({ where: { eventId: { in: eventIds } } });
            await prismaA.ticket.deleteMany({ where: { eventId: { in: eventIds } } });
            await prismaA.orderItem.deleteMany({ where: { order: { eventId: { in: eventIds } } } });
            await prismaA.order.deleteMany({ where: { eventId: { in: eventIds } } });
            await prismaA.batch.deleteMany({ where: { eventId: { in: eventIds } } });
            await prismaA.event.deleteMany({ where: { id: { in: eventIds } } });
        }
        await prismaA.clubMember.deleteMany({ where: { email: { startsWith: prefix } } });
        await prismaA.user.deleteMany({ where: { email: { startsWith: prefix } } });
        await Promise.all([prismaA.$disconnect(), prismaB.$disconnect()]);
    });
    async function createFixture() {
        const user = await prismaA.user.create({ data: {
                email: `${prefix}@example.test`, password: 'hash', name: 'Member', isVerified: true,
            } });
        const member = await prismaA.clubMember.create({ data: {
                email: user.email, name: user.name, discountPercentage: new client_1.Prisma.Decimal('12.50'),
            } });
        const event = await prismaA.event.create({ data: {
                producerId: user.id, title: 'Club integration', description: 'integration', slug: `${prefix}-event`,
                venue: 'Test', address: 'Test', city: 'Test', state: 'TS', status: 'PUBLISHED',
                startDate: new Date(Date.now() + 86_400_000), endDate: new Date(Date.now() + 172_800_000),
            } });
        const [cheap, expensive] = await Promise.all([
            prismaA.batch.create({ data: { eventId: event.id, name: 'Cheap', price: 50, quantity: 20, startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 60_000), sortOrder: 0 } }),
            prismaA.batch.create({ data: { eventId: event.id, name: 'Expensive', price: 100, quantity: 20, startsAt: new Date(Date.now() - 1000), endsAt: new Date(Date.now() + 60_000), sortOrder: 1 } }),
        ]);
        return { user, member, event, cheap, expensive };
    }
    async function reserve(prisma, suffix) {
        try {
            return await (0, serializable_retry_util_1.withSerializableRetry)(() => prisma.$transaction(async (tx) => {
                const now = new Date();
                const decision = await benefits.evaluateInTransaction(tx, {
                    userId: fixture.user.id,
                    eventId: fixture.event.id,
                    items: [
                        { batchId: fixture.cheap.id, batchName: fixture.cheap.name, sortOrder: 0, unitPrice: fixture.cheap.price, quantity: 2 },
                        { batchId: fixture.expensive.id, batchName: fixture.expensive.name, sortOrder: 1, unitPrice: fixture.expensive.price, quantity: 1 },
                    ],
                    hasCoupon: false,
                    now,
                });
                const expiresAt = new Date(now.getTime() + 60_000);
                const order = await tx.order.create({ data: {
                        userId: fixture.user.id, eventId: fixture.event.id, subtotal: 200, platformFee: 20,
                        discountAmount: decision.discountAmount, total: new client_1.Prisma.Decimal(220).sub(decision.discountAmount),
                        clubBenefitReason: decision.reason, expiresAt,
                        items: { create: [
                                { batchId: fixture.cheap.id, quantity: 2, unitPrice: 50, total: 100 },
                                { batchId: fixture.expensive.id, quantity: 1, unitPrice: 100, total: 100 },
                            ] },
                    } });
                const usage = await benefits.createReservationInTransaction(tx, decision, {
                    eventId: fixture.event.id, orderId: order.id, expiresAt, now,
                });
                return { order, usage, suffix };
            }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }));
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException('reserva concorrente');
            }
            throw error;
        }
    }
    it('duas reservas simultâneas deixam somente uma utilização ativa', async () => {
        const settled = await Promise.allSettled([reserve(prismaA, 'a'), reserve(prismaB, 'b')]);
        expect(settled.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
        expect(settled.filter(({ status }) => status === 'rejected')).toHaveLength(1);
        expect(await prismaA.clubBenefitUsage.count({ where: {
                clubMemberId: fixture.member.id, eventId: fixture.event.id, activeMarker: true,
            } })).toBe(1);
    });
    it('confirma o snapshot e associa o ticket do lote mais caro', async () => {
        const usage = await prismaA.clubBenefitUsage.findFirstOrThrow({
            where: { clubMemberId: fixture.member.id, eventId: fixture.event.id, activeMarker: true },
            include: { reservedOrder: true },
        });
        const expiration = new order_expiration_service_1.OrderExpirationService(prismaA, benefits);
        const fulfillment = new order_fulfillment_service_1.OrderFulfillmentService(prismaA, new tickets_service_1.TicketsService(prismaA), mail, config, expiration, benefits);
        await expect(fulfillment.confirmPaidOrder({ orderId: usage.reservedOrderId, gateway: 'STRIPE' }))
            .resolves.toMatchObject({ status: 'FULFILLED' });
        const confirmed = await prismaA.clubBenefitUsage.findUniqueOrThrow({
            where: { id: usage.id }, include: { ticket: true },
        });
        expect(confirmed.status).toBe('CONFIRMED');
        expect(confirmed.discountPercentage.toFixed(2)).toBe('12.50');
        expect(confirmed.ticket?.batchId).toBe(fixture.expensive.id);
        expect(await prismaA.ticket.count({ where: { orderId: usage.reservedOrderId } })).toBe(3);
    });
});
//# sourceMappingURL=club-benefits.postgres.integration.spec.js.map