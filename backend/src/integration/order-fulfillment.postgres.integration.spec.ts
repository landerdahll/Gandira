import { PrismaClient } from '@prisma/client';
import { OrderExpirationService } from '../modules/order-fulfillment/order-expiration.service';
import { OrderFulfillmentService } from '../modules/order-fulfillment/order-fulfillment.service';
import { TicketsService } from '../modules/tickets/tickets.service';
import { ClubBenefitsService } from '../modules/club-benefits/club-benefits.service';

const databaseUrl = process.env.DATABASE_URL ?? '';
const describeIntegration = process.env.RUN_INTEGRATION === 'true' ? describe : describe.skip;

jest.setTimeout(120_000);

describeIntegration('Order fulfillment with real PostgreSQL', () => {
  const prefix = `it-fulfillment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const prismaA = new PrismaClient();
  const prismaB = new PrismaClient();
  const mail = { sendOrderConfirmation: jest.fn().mockResolvedValue(undefined) };
  const config = { get: <T>(_key: string, fallback?: T) => fallback as T };

  function service(prisma: PrismaClient) {
    const clubBenefits = new ClubBenefitsService();
    const expiration = new OrderExpirationService(prisma as never, clubBenefits);
    return new OrderFulfillmentService(
      prisma as never,
      new TicketsService(prisma as never),
      mail as never,
      config as never,
      expiration,
      clubBenefits,
    );
  }

  beforeAll(async () => {
    if (!databaseUrl.includes('127.0.0.1:55432/outrahora_test')) {
      throw new Error('Integration tests refuse to run outside the temporary outrahora_test database');
    }
  });

  afterAll(async () => {
    const eventIds = (await prismaA.event.findMany({ where: { slug: { startsWith: prefix } }, select: { id: true } })).map(({ id }) => id);
    if (eventIds.length) {
      await prismaA.ticket.deleteMany({ where: { eventId: { in: eventIds } } });
      await prismaA.orderItem.deleteMany({ where: { order: { eventId: { in: eventIds } } } });
      await prismaA.order.deleteMany({ where: { eventId: { in: eventIds } } });
      await prismaA.batch.deleteMany({ where: { eventId: { in: eventIds } } });
      await prismaA.event.deleteMany({ where: { id: { in: eventIds } } });
    }
    await prismaA.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await Promise.all([prismaA.$disconnect(), prismaB.$disconnect()]);
  });

  async function fixture(label: string, expired = false) {
    const key = `${prefix}-${label}`;
    const user = await prismaA.user.create({ data: { email: `${key}@example.test`, password: 'hash', name: 'Buyer' } });
    const event = await prismaA.event.create({ data: {
      producerId: user.id, title: label, description: 'integration', slug: key,
      venue: 'Test', address: 'Test', city: 'Test', state: 'TS',
      startDate: new Date(Date.now() + 86_400_000), endDate: new Date(Date.now() + 172_800_000), status: 'PUBLISHED',
    } });
    const batch = await prismaA.batch.create({ data: {
      eventId: event.id, name: 'Batch', price: 20, quantity: 10, sold: 2,
      startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 60_000),
    } });
    const order = await prismaA.order.create({ data: {
      userId: user.id, eventId: event.id, subtotal: 40, platformFee: 4, total: 44,
      expiresAt: new Date(Date.now() + (expired ? -60_000 : 60_000)),
      items: { create: { batchId: batch.id, quantity: 2, unitPrice: 20, total: 40 } },
    } });
    return { order, batch };
  }

  it('duas confirmações concorrentes geram um único conjunto de tickets', async () => {
    const { order } = await fixture('concurrent');
    const results = await Promise.all([
      service(prismaA).confirmPaidOrder({ orderId: order.id, gateway: 'STRIPE', externalPaymentId: 'pi_test', stripeChargeId: 'ch_test' }),
      service(prismaB).confirmPaidOrder({ orderId: order.id, gateway: 'ABACATEPAY', externalPaymentId: 'pix_test' }),
    ]);
    expect(results.map(({ status }) => status).sort()).toEqual(['ALREADY_PAID', 'FULFILLED']);
    expect(await prismaA.ticket.count({ where: { orderId: order.id } })).toBe(2);
    expect(mail.sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it('pagamento tardio expira pedido e devolve estoque apenas uma vez', async () => {
    const { order, batch } = await fixture('late', true);
    const fulfillment = service(prismaA);
    await expect(fulfillment.confirmPaidOrder({ orderId: order.id, gateway: 'ABACATEPAY', externalPaymentId: 'pix_late' }))
      .resolves.toEqual({ status: 'LATE_PAYMENT_REQUIRES_REVIEW', orderStatus: 'EXPIRED' });
    await fulfillment.confirmPaidOrder({ orderId: order.id, gateway: 'ABACATEPAY', externalPaymentId: 'pix_late' });
    expect(await prismaA.order.findUnique({ where: { id: order.id }, select: { status: true } })).toEqual({ status: 'EXPIRED' });
    expect(await prismaA.batch.findUnique({ where: { id: batch.id }, select: { sold: true } })).toEqual({ sold: 0 });
    expect(await prismaA.ticket.count({ where: { orderId: order.id } })).toBe(0);
  });
});
