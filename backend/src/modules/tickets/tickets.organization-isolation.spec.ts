import { NotFoundException } from '@nestjs/common';
import { TicketsService } from './tickets.service';

describe('TicketsService organization boundaries', () => {
  it('rejects cross-organization check-in before looking up the QR token', async () => {
    const tx = { ticket: { findUnique: jest.fn() } };
    const prisma = { $transaction: jest.fn((callback: any) => callback(tx)) };
    const access = { forEventPermission: jest.fn().mockRejectedValue(new NotFoundException('Evento não encontrado')) };
    const service = new TicketsService(prisma as any, access as any);
    await expect(service.validateAndCheckIn('token-from-org-b', 'event-b', { id: 'staff-a' })).rejects.toBeInstanceOf(NotFoundException);
    expect(access.forEventPermission).toHaveBeenCalledWith({ id: 'staff-a' }, 'event-b', 'CHECK_IN_MANAGE', tx);
    expect(tx.ticket.findUnique).not.toHaveBeenCalled();
  });

  it('keeps personal tickets scoped to the user rather than an administrative organization', async () => {
    const prisma = { ticket: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) } };
    const service = new TicketsService(prisma as any, {} as any);
    await service.findUserTickets('buyer-id');
    const where = { OR: [{ ownerUserId: 'buyer-id' }, { transfers: { some: { senderUserId: 'buyer-id' } } }] };
    expect(prisma.ticket.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(prisma.ticket.count).toHaveBeenCalledWith({ where });
  });
});
