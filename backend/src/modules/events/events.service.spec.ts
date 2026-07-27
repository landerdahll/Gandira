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
    },
  };
  const service = new EventsService(prisma as any);

  beforeEach(() => jest.clearAllMocks());

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
