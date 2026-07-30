import { ReportsService } from './reports.service';

describe('ReportsService organization isolation', () => {
  const prisma = {
    event: { count: jest.fn().mockResolvedValue(1) },
    order: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { total: 100 } }),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    ticket: { count: jest.fn().mockResolvedValue(2) },
    coupon: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const access = {
    forCollectionPermission: jest.fn().mockResolvedValue({ organizationId: 'org-a', isSuperAdmin: false }),
    eventOrganizationWhere: jest.fn().mockReturnValue({ organizationId: 'org-a' }),
  };
  const service = new ReportsService(prisma as any, access as any);

  beforeEach(() => jest.clearAllMocks());

  it('applies the same organization ownership filter to every dashboard aggregate', async () => {
    await service.getProducerDashboard({ id: 'producer-a', platformRole: 'MEMBER' });

    expect(prisma.event.count).toHaveBeenCalledWith({ where: { organizationId: 'org-a' } });
    expect(prisma.order.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'PAID', event: { organizationId: 'org-a' } },
    }));
    expect(prisma.ticket.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ event: { organizationId: 'org-a' } }),
    }));
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'PAID', event: { organizationId: 'org-a' } },
    }));
    expect(prisma.order.groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: 'PAID', event: { organizationId: 'org-a' } },
    }));
    expect(prisma.coupon.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { event: { organizationId: 'org-a' }, usedCount: { gt: 0 } },
    }));
  });
});
