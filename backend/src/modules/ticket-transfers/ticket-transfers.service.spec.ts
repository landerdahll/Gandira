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

describe('TicketTransfersService queued invitation email', () => {
  const transfer = { id: 'tr1', recipientEmail: 'guest@example.com' };
  const notification = {
    recipient: null,
    ticket: {
      owner: { email: 'owner@example.com', name: 'Owner' },
      event: { title: 'Demo Event' },
    },
  };

  function setup(demoMode: string) {
    const enqueue = jest.fn().mockResolvedValue({ id: 'outbox-1' });
    const config = {
      get: jest.fn((key: string, fallback: string) => ({
        DEMO_EMAIL_MODE: demoMode,
        FRONTEND_URL: 'https://demo.gandira.test',
      }[key] ?? fallback)),
    };
    const service = new TicketTransfersService({} as any, {} as any, config as any, { enqueue } as any);
    return { service, enqueue };
  }

  it('enfileira o convite sem persistir ou registrar o token puro', async () => {
    const { service, enqueue } = setup('true');
    const logger = jest.spyOn((service as any).logger, 'log');

    await (service as any).enqueueRequestedEmails({} as any, transfer, notification);

    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
      type: 'TRANSFER_INVITE',
      recipient: transfer.recipientEmail,
      payload: expect.objectContaining({
        tokenRecordId: transfer.id,
        tokenPurpose: 'transfer-invite',
        tokenPath: '/auth/register',
      }),
    }), expect.anything());
    expect(JSON.stringify(enqueue.mock.calls)).not.toContain('temporary-invite-token');
    expect(logger).not.toHaveBeenCalled();
  });

  it('mantém o mesmo envio seguro quando DEMO_EMAIL_MODE=false', async () => {
    const { service, enqueue } = setup('false');
    const logger = jest.spyOn((service as any).logger, 'log');

    await (service as any).enqueueRequestedEmails({} as any, transfer, notification);

    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
      type: 'TRANSFER_PENDING_SENDER',
      recipient: notification.ticket.owner.email,
    }), expect.anything());
    expect(enqueue).toHaveBeenCalledWith(expect.objectContaining({
      type: 'TRANSFER_INVITE',
      recipient: transfer.recipientEmail,
    }), expect.anything());
    expect(logger).not.toHaveBeenCalled();
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

describe('TicketTransfersService organization isolation', () => {
  const access = {
    forCollection: jest.fn(),
    forEvent: jest.fn(),
    eventOrganizationWhere: jest.fn().mockReturnValue({ organizationId: 'org-a' }),
  };
  const prisma = {
    ticketTransfer: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn(),
    },
  };
  const service = new TicketTransfersService(prisma as any, {} as any, {} as any, undefined, undefined, access as any);
  const actor = { id: 'admin-a', platformRole: 'MEMBER' };

  beforeEach(() => jest.clearAllMocks());

  it('derives organization from eventId and keeps the organization filter mandatory', async () => {
    access.forEvent.mockResolvedValue({ organizationId: 'org-a', isSuperAdmin: false });
    await service.adminList({ eventId: 'event-a', page: 1, limit: 20 }, actor);

    expect(access.forEvent).toHaveBeenCalledWith(actor, 'event-a', ['ORG_ADMIN', 'PRODUCER']);
    expect(prisma.ticketTransfer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ eventId: 'event-a', event: { organizationId: 'org-a' } }),
    }));
    expect(prisma.ticketTransfer.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ event: { organizationId: 'org-a' } }),
    }));
  });

  it('authorizes transfer detail through its event', async () => {
    prisma.ticketTransfer.findUnique
      .mockResolvedValueOnce({ eventId: 'event-a' })
      .mockResolvedValueOnce({ id: 'transfer-a', eventId: 'event-a' });
    access.forEvent.mockResolvedValue({ organizationId: 'org-a' });

    await service.adminDetail('transfer-a', actor);
    expect(access.forEvent).toHaveBeenCalledWith(actor, 'event-a', ['ORG_ADMIN', 'PRODUCER']);
  });
});
