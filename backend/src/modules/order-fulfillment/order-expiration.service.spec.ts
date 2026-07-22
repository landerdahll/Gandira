import { OrderExpirationService } from './order-expiration.service';

describe('OrderExpirationService', () => {
  function setup(claimCount = 1, status = 'PENDING') {
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
        findUnique: jest.fn().mockResolvedValue({ status }),
      },
      orderItem: { findMany: jest.fn().mockResolvedValue([{ batchId: 'batch-1', quantity: 2 }]) },
      batch: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const clubBenefits = { releaseForOrderInTransaction: jest.fn().mockResolvedValue({ count: 1 }) };
    return { service: new OrderExpirationService(prisma as never, clubBenefits as never), tx, prisma, clubBenefits };
  }

  it('reivindica PENDING vencido e devolve estoque uma vez', async () => {
    const { service, tx, clubBenefits } = setup();
    await expect(service.expirePendingOrder('order-1')).resolves.toBe('EXPIRED');
    expect(tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'order-1', status: 'PENDING' }),
      data: { status: 'EXPIRED' },
    }));
    expect(tx.batch.update).toHaveBeenCalledTimes(1);
    expect(tx.batch.update).toHaveBeenCalledWith({
      where: { id: 'batch-1' },
      data: { sold: { decrement: 2 }, status: 'ACTIVE' },
    });
    expect(clubBenefits.releaseForOrderInTransaction).toHaveBeenCalledWith(
      tx, 'order-1', 'ORDER_EXPIRED', expect.any(Date),
    );
  });

  it('é idempotente e não libera estoque quando o claim falha', async () => {
    const { service, tx } = setup(0, 'EXPIRED');
    await expect(service.expirePendingOrder('order-1')).resolves.toBe('ALREADY_EXPIRED');
    expect(tx.orderItem.findMany).not.toHaveBeenCalled();
    expect(tx.batch.update).not.toHaveBeenCalled();
  });
});
