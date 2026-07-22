import { OrdersService } from './orders.service';
import { Prisma } from '@prisma/client';

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
    const batches = { reserveStock: jest.fn().mockResolvedValue({ price: '100.00', name: 'Lote', sortOrder: 0 }) };
    const payments = {
      createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_1', client_secret: 'secret' }),
    };
    const coupons = {};
    const expiration = {
      expirePendingOrder: jest.fn().mockResolvedValue('EXPIRED'),
      cancelPendingOrder: jest.fn().mockResolvedValue(true),
    };
    const clubBenefits = {
      evaluateInTransaction: jest.fn().mockResolvedValue({ applied: false, reason: 'NOT_MEMBER' }),
      createReservationInTransaction: jest.fn().mockResolvedValue(null),
      toResponse: jest.fn((value) => value),
    };
    const service = new OrdersService(prisma as never, batches as never, payments as never, coupons as never, expiration as never, clubBenefits as never);
    return { service, prisma, batches, payments, expiration, clubBenefits };
  }

  it('cria Order.expiresAt aproximadamente 60 minutos no futuro', async () => {
    const { service, prisma } = setup();
    const before = Date.now();
    const tx = {
      order: { create: jest.fn(({ data }) => Promise.resolve({ id: 'order-1', eventId: 'event-1', total: data.total, expiresAt: data.expiresAt })) },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    await service.create({ eventId: 'event-1', items: [{ batchId: 'batch-1', quantity: 1 }] }, 'user-1');
    const expiresAt = tx.order.create.mock.calls[0][0].data.expiresAt as Date;
    expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(3_599_000);
    expect(expiresAt.getTime() - before).toBeLessThanOrEqual(3_601_000);
  });

  it('cron reutiliza a mesma rotina idempotente de expiração', async () => {
    const { service, expiration } = setup();
    await service.expireStaleOrders();
    expect(expiration.expirePendingOrder).toHaveBeenCalledWith('stale-1');
  });

  it('retorna discountType CLUB e o snapshot autoritativo criado na transação', async () => {
    const { service, prisma, clubBenefits } = setup();
    const decision = {
      applied: true, reason: 'AVAILABLE', clubMemberId: 'member-1', batchId: 'batch-1', batchName: 'Lote',
      discountPercentage: new Prisma.Decimal('15.75'), originalAmount: new Prisma.Decimal('100.00'),
      discountAmount: new Prisma.Decimal('15.75'), finalAmount: new Prisma.Decimal('84.25'),
    };
    clubBenefits.evaluateInTransaction.mockResolvedValue(decision);
    clubBenefits.toResponse.mockReturnValue({ applied: true, reason: 'AVAILABLE', discountPercentage: '15.75' });
    const tx = {
      order: { create: jest.fn(({ data }) => Promise.resolve({ id: 'order-1', eventId: 'event-1', total: data.total, expiresAt: data.expiresAt })) },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    const result = await service.create({ eventId: 'event-1', items: [{ batchId: 'batch-1', quantity: 1 }] }, 'user-1');
    expect(result).toEqual(expect.objectContaining({
      discountType: 'CLUB', clubBenefit: expect.objectContaining({ applied: true, reason: 'AVAILABLE' }),
    }));
    expect(clubBenefits.createReservationInTransaction).toHaveBeenCalledWith(
      tx, decision, expect.objectContaining({ orderId: 'order-1' }),
    );
  });

  it('cancela pedido pendente e libera reservas quando a criação da cobrança falha', async () => {
    const { service, prisma, payments, expiration } = setup();
    const tx = {
      order: { create: jest.fn(({ data }) => Promise.resolve({ id: 'order-1', eventId: 'event-1', total: data.total, expiresAt: data.expiresAt })) },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    payments.createPaymentIntent.mockRejectedValue(new Error('gateway unavailable'));
    await expect(service.create({ eventId: 'event-1', items: [{ batchId: 'batch-1', quantity: 1 }] }, 'user-1'))
      .rejects.toThrow('gateway unavailable');
    expect(expiration.cancelPendingOrder).toHaveBeenCalledWith('order-1', 'PAYMENT_CREATION_FAILED');
  });
});
