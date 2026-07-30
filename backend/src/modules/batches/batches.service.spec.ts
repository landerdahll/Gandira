import { BatchesService } from './batches.service';

describe('BatchesService organization isolation', () => {
  const prisma = {
    event: { findUnique: jest.fn() },
    batch: { create: jest.fn() },
  };
  const access = { forEvent: jest.fn().mockResolvedValue({ organizationId: 'org-a' }) };
  const service = new BatchesService(prisma as any, access as any);

  it('derives access from the event before creating a batch', async () => {
    prisma.event.findUnique.mockResolvedValue({ id: 'event-a', status: 'DRAFT', startDate: new Date('2027-02-01') });
    prisma.batch.create.mockResolvedValue({ id: 'batch-a' });
    const actor = { id: 'producer-a', platformRole: 'MEMBER' };

    await service.create('event-a', {
      name: 'Lote', price: 50, quantity: 10,
      startsAt: '2027-01-01', endsAt: '2027-01-31',
    } as any, actor);

    expect(access.forEvent).toHaveBeenCalledWith(actor, 'event-a', ['ORG_ADMIN', 'PRODUCER']);
    expect(prisma.batch.create).toHaveBeenCalled();
  });
});
