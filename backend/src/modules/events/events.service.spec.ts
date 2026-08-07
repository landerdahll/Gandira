import { BadRequestException } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { EventsService } from './events.service';

describe('EventsService featured events', () => {
  const prisma = {
    event: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };
  const organizationAccess = {
    forCollectionPermission: jest.fn(),
    forEventPermission: jest.fn(),
    eventOrganizationWhere: jest.fn(),
  };
  const service = new EventsService(prisma as any, organizationAccess as any);

  beforeEach(() => jest.clearAllMocks());

  it('assigns a newly created event to the resolved organization', async () => {
    organizationAccess.forCollectionPermission.mockResolvedValue({ organizationId: 'org-1' });
    prisma.event.findUnique.mockResolvedValue(null);
    prisma.event.create.mockImplementation(({ data }) => Promise.resolve(data));

    const dto = {
      title: 'Evento da organização',
      description: 'Descrição',
      venue: 'Local',
      address: 'Rua 1',
      city: 'Porto Alegre',
      state: 'RS',
      startDate: '2027-01-01T20:00:00.000Z',
      endDate: '2027-01-02T02:00:00.000Z',
    };

    await service.create(dto as any, { id: 'producer-1', platformRole: 'MEMBER' });

    expect(organizationAccess.forCollectionPermission).toHaveBeenCalledWith(
      { id: 'producer-1', platformRole: 'MEMBER' },
      'EVENTS_MANAGE',
      { organizationId: undefined },
    );
    expect(prisma.event.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: 'org-1', producerId: 'producer-1' }),
    }));
  });

  it('uses the explicitly selected organization for users with multiple memberships', async () => {
    organizationAccess.forCollectionPermission.mockResolvedValue({ organizationId: 'org-b' });
    prisma.event.findUnique.mockResolvedValue(null);
    prisma.event.create.mockImplementation(({ data }) => Promise.resolve(data));
    await service.create({ title: 'Evento B', startDate: '2027-01-01', endDate: '2027-01-02' } as any, { id: 'multi-user' }, 'org-b');
    expect(organizationAccess.forCollectionPermission).toHaveBeenCalledWith({ id: 'multi-user' }, 'EVENTS_MANAGE', { organizationId: 'org-b' });
    expect(prisma.event.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: 'org-b' }) }));
  });

  it('lists administrative events using organizationId instead of producerId', async () => {
    organizationAccess.forCollectionPermission.mockResolvedValue({ organizationId: 'org-a', isSuperAdmin: false });
    organizationAccess.eventOrganizationWhere.mockReturnValue({ organizationId: 'org-a' });
    prisma.event.findMany.mockResolvedValue([]);
    prisma.event.count.mockResolvedValue(0);

    await service.findProducerEvents({ id: 'producer-a', platformRole: 'MEMBER' });

    expect(prisma.event.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-a' },
    }));
    expect(prisma.event.count).toHaveBeenCalledWith({ where: { organizationId: 'org-a' } });
  });

  it('keeps the published catalog global without an organization filter', async () => {
    prisma.event.findMany.mockResolvedValue([{ id: 'event-a' }, { id: 'event-b' }]);
    prisma.event.count.mockResolvedValue(2);
    await service.findAll({ page: 1, limit: 20 });
    const where = prisma.event.findMany.mock.calls[0][0].where;
    expect(where.status).toBe(EventStatus.PUBLISHED);
    expect(where).not.toHaveProperty('organizationId');
    expect(organizationAccess.forCollectionPermission).not.toHaveBeenCalled();
  });

  it('clears ended flags and returns the nearest configured featured event', async () => {
    const selected = { id: 'featured-1', featured: true };
    prisma.event.updateMany.mockResolvedValue({ count: 1 });
    prisma.event.findFirst.mockResolvedValue(selected);

    await expect(service.findFeatured()).resolves.toBe(selected);
    expect(prisma.event.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ featured: true, endDate: expect.any(Object) }),
      data: { featured: false },
    }));
    expect(prisma.event.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: EventStatus.PUBLISHED, featured: true }),
      orderBy: { startDate: 'asc' },
    }));
    expect(prisma.event.findFirst).toHaveBeenCalledTimes(1);
  });

  it('falls back to the next published event when no configured feature is eligible', async () => {
    const fallback = { id: 'next-1', featured: false };
    prisma.event.updateMany.mockResolvedValue({ count: 0 });
    prisma.event.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(fallback);

    await expect(service.findFeatured()).resolves.toBe(fallback);
    expect(prisma.event.findFirst).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: expect.objectContaining({ status: EventStatus.PUBLISHED, startDate: expect.any(Object) }),
      orderBy: { startDate: 'asc' },
    }));
  });

  it('does not allow an ended event to be marked as featured', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: 'ended', endDate: new Date(Date.now() - 1_000) });

    await expect(service.setFeatured('ended', true)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.event.update).not.toHaveBeenCalled();
  });
});
