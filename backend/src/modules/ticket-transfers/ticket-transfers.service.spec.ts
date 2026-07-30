import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { TicketTransfersService } from './ticket-transfers.service';

describe('TicketTransfersService invitation security', () => {
  const rawToken = 'secure-one-time-token';
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const future = new Date(Date.now() + 60_000);
  let prisma: any;
  let service: TicketTransfersService;

  beforeEach(() => {
    prisma = { ticketTransfer: { findUnique: jest.fn() } };
    service = new TicketTransfersService(prisma, {} as any, {} as any);
  });

  it('aceita convite pendente somente para o e-mail normalizado', async () => {
    prisma.ticketTransfer.findUnique.mockResolvedValue({ id: 'tr1', status: 'PENDING_REGISTRATION', recipientEmail: 'destino@email.com', expiresAt: future });
    await expect(service.inspectInvite(rawToken, ' Destino@Email.com ')).resolves.toMatchObject({ id: 'tr1' });
    expect(prisma.ticketTransfer.findUnique).toHaveBeenCalledWith({ where: { invitationTokenHash: tokenHash } });
  });

  it.each(['CANCELLED', 'COMPLETED', 'EXPIRED'])('rejeita convite com status %s', async status => {
    prisma.ticketTransfer.findUnique.mockResolvedValue({ id: 'tr1', status, recipientEmail: 'destino@email.com', expiresAt: future });
    await expect(service.inspectInvite(rawToken, 'destino@email.com')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita tentativa de cadastrar outro e-mail', async () => {
    prisma.ticketTransfer.findUnique.mockResolvedValue({ id: 'tr1', status: 'PENDING_REGISTRATION', recipientEmail: 'destino@email.com', expiresAt: future });
    await expect(service.inspectInvite(rawToken, 'intruso@email.com')).rejects.toThrow('O e-mail deve ser o mesmo do convite');
  });

  it('não consulta convite pelo token em texto puro', async () => {
    prisma.ticketTransfer.findUnique.mockResolvedValue(null);
    await expect(service.inspectInvite(rawToken, 'destino@email.com')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.ticketTransfer.findUnique.mock.calls[0][0].where.invitationTokenHash).not.toBe(rawToken);
  });
});

describe('TicketTransfersService Clube Outrahora', () => {
  it('bloqueia a transferência do ingresso que recebeu o benefício', async () => {
    const ticket = {
      id: 'ticket-1', ownerUserId: 'owner-1', status: 'ACTIVE', checkIn: null,
      owner: { email: 'owner@example.com' },
      event: { allowTicketTransfers: true, startDate: new Date(Date.now() + 60_000) },
      order: { status: 'PAID' },
      clubBenefitUsage: { id: 'usage-1' },
    };
    const tx = { ticket: { findUnique: jest.fn().mockResolvedValue(ticket) } };
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new TicketTransfersService(prisma as any, {} as any, {} as any);
    await expect(service.request('ticket-1', 'owner-1', 'guest@example.com'))
      .rejects.toThrow('Este ingresso recebeu o benefício do Clube Outrahora e não pode ser transferido');
  });
});
