import { CouponsService } from './coupons.service';

describe('CouponsService organization isolation', () => {
  const prisma = {
    event: { findUnique: jest.fn() },
    coupon: { findUnique: jest.fn(), create: jest.fn() },
  };
  const access = { forEvent: jest.fn().mockResolvedValue({ organizationId: 'org-a' }) };
  const service = new CouponsService(prisma as any, access as any);

  beforeEach(() => jest.clearAllMocks());

  it('authorizes by the event organization instead of producerId', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: 'event-a', producerId: 'another-producer' });
    prisma.coupon.findUnique.mockResolvedValue(null);
    prisma.coupon.create.mockResolvedValue({ id: 'coupon-a' });
    const actor = { id: 'producer-a', platformRole: 'MEMBER' };

    await service.create('event-a', actor, { code: 'PAGO10', discount: 10 } as any);

    expect(access.forEvent).toHaveBeenCalledWith(actor, 'event-a', ['ORG_ADMIN', 'PRODUCER']);
    expect(prisma.coupon.create).toHaveBeenCalled();
  });

  it('keeps public coupon validation independent from organization membership', async () => {
    prisma.coupon.findUnique.mockResolvedValue({ id: 'coupon-a', isActive: true, discount: 10, maxUses: null, usedCount: 0, expiresAt: null, code: 'PAGO10' });
    await service.validate('event-a', 'pago10');
    expect(access.forEvent).not.toHaveBeenCalled();
  });
});
