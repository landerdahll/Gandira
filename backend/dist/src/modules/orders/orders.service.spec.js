"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orders_service_1 = require("./orders.service");
describe('OrdersService expiration', () => {
    function setup() {
        const prisma = {
            user: { findUnique: jest.fn().mockResolvedValue({ isVerified: true }) },
            event: { findUnique: jest.fn().mockResolvedValue({ status: 'PUBLISHED', startDate: new Date(Date.now() + 86_400_000) }) },
            batch: { findMany: jest.fn().mockResolvedValue([{ id: 'batch-1' }]) },
            order: {
                findMany: jest.fn().mockResolvedValue([{ id: 'stale-1' }]),
                update: jest.fn().mockResolvedValue({}),
            },
            coupon: { update: jest.fn() },
            $transaction: jest.fn(),
        };
        const batches = { reserveStock: jest.fn().mockResolvedValue({ price: '100.00' }) };
        const payments = {
            createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_1', client_secret: 'secret' }),
        };
        const coupons = {};
        const expiration = { expirePendingOrder: jest.fn().mockResolvedValue('EXPIRED') };
        const service = new orders_service_1.OrdersService(prisma, batches, payments, coupons, expiration);
        return { service, prisma, batches, payments, expiration };
    }
    it('cria Order.expiresAt aproximadamente 60 minutos no futuro', async () => {
        const { service, prisma } = setup();
        const before = Date.now();
        const tx = {
            order: { create: jest.fn(({ data }) => Promise.resolve({ id: 'order-1', eventId: 'event-1', total: data.total, expiresAt: data.expiresAt })) },
        };
        prisma.$transaction.mockImplementation((callback) => callback(tx));
        await service.create({ eventId: 'event-1', items: [{ batchId: 'batch-1', quantity: 1 }] }, 'user-1');
        const expiresAt = tx.order.create.mock.calls[0][0].data.expiresAt;
        expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(3_599_000);
        expect(expiresAt.getTime() - before).toBeLessThanOrEqual(3_601_000);
    });
    it('cron reutiliza a mesma rotina idempotente de expiração', async () => {
        const { service, expiration } = setup();
        await service.expireStaleOrders();
        expect(expiration.expirePendingOrder).toHaveBeenCalledWith('stale-1');
    });
});
//# sourceMappingURL=orders.service.spec.js.map