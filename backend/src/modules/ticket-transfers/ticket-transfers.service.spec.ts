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

describe('TicketTransfersService demo email mode', () => {
  const transfer = { id: 'tr1', recipientEmail: 'guest@example.com' };
  const notification = {
    invitationToken: 'temporary-invite-token',
    recipient: null,
    ticket: {
      owner: { email: 'owner@example.com', name: 'Owner' },
      event: { title: 'Demo Event' },
    },
  };

  function setup(demoMode: string) {
    const mail = { sendTicketTransferEmail: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: jest.fn((key: string, fallback: string) => ({
        DEMO_EMAIL_MODE: demoMode,
        FRONTEND_URL: 'https://demo.gandira.test',
      }[key] ?? fallback)),
    };
    const service = new TicketTransfersService({} as any, mail as any, config as any);
    return { service, mail };
  }

  it('gera e registra o link completo do convite sem deixar de enviar pela Resend', async () => {
    const { service, mail } = setup('true');
    const logger = jest.spyOn((service as any).logger, 'log');

    await (service as any).sendRequestedEmails(transfer, notification);

    const inviteUrl = 'https://demo.gandira.test/auth/register?transferInvite=temporary-invite-token&email=guest%40example.com';
    expect(mail.sendTicketTransferEmail).toHaveBeenCalledWith(
      transfer.recipientEmail,
      expect.any(String),
      expect.any(String),
      inviteUrl,
    );
    expect(logger).toHaveBeenCalledWith(expect.stringContaining('[DEMO EMAIL MODE] Convite de transferência'));
    expect(logger).toHaveBeenCalledWith(expect.stringContaining('Destinatário: g***@e***.com'));
    expect(logger).toHaveBeenCalledWith(expect.stringContaining(`Link: ${inviteUrl}`));
  });

  it('não registra tokens de convite quando DEMO_EMAIL_MODE=false', async () => {
    const { service, mail } = setup('false');
    const logger = jest.spyOn((service as any).logger, 'log');

    await (service as any).sendRequestedEmails(transfer, notification);

    expect(mail.sendTicketTransferEmail).toHaveBeenCalledTimes(2);
    expect(logger).not.toHaveBeenCalledWith(expect.stringContaining('[DEMO EMAIL MODE]'));
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
