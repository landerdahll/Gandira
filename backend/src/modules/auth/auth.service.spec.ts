import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({ hash: jest.fn() }));

describe('AuthService registration with transfer invite', () => {
  const dto: any = {
    name: 'Recipient',
    email: 'recipient@example.com',
    password: 'StrongPass1',
    invitationToken: 'raw-invite',
  };

  function setup(completeInvite: jest.Mock, configValues: Record<string, string> = {}) {
    const committedUsers: any[] = [];
    const tx: any = {
      ticketTransfer: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'PENDING_REGISTRATION',
          expiresAt: new Date(Date.now() + 60_000),
          recipientEmail: dto.email,
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(async ({ data }: any) => ({ id: 'user-new', ...data, role: 'CUSTOMER', isVerified: data.isVerified ?? false })),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      emailVerificationToken: { create: jest.fn().mockResolvedValue({}) },
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue(null), create: tx.user.create },
      refreshToken: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn() },
      emailVerificationToken: { create: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn(async (callback: any) => {
        const snapshot = [...committedUsers];
        try {
          const result = await callback(tx);
          committedUsers.push(result.user);
          return result;
        } catch (error) {
          committedUsers.splice(0, committedUsers.length, ...snapshot);
          throw error;
        }
      }),
    };
    const mail: any = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };
    const transfers: any = {
      prepareInviteCompletion: jest.fn().mockResolvedValue({ nextToken: 'new-ticket-token', qrCodeUrl: 'data:image/png' }),
      hashInviteToken: jest.fn().mockReturnValue('invite-hash'),
      completeInviteInTransaction: completeInvite,
      notifyInviteCompleted: jest.fn(),
    };
    const jwt: any = { signAsync: jest.fn().mockResolvedValue('access-token') };
    const config: any = { get: jest.fn((key: string, fallback: string) => configValues[key] ?? fallback) };
    const service = new AuthService(prisma, jwt, config, mail, transfers);
    return { service, prisma, tx, mail, transfers, jwt, committedUsers };
  }

  beforeEach(() => (bcrypt.hash as jest.Mock).mockResolvedValue('password-hash'));
  afterEach(() => jest.restoreAllMocks());

  it('marca cadastro comum como verificado e registra o link quando DEMO_EMAIL_MODE=true', async () => {
    const context = setup(jest.fn(), { DEMO_EMAIL_MODE: 'true', FRONTEND_URL: 'https://demo.gandira.test' });
    const logger = jest.spyOn((context.service as any).logger, 'log');

    const result = await context.service.register({ ...dto, invitationToken: undefined });

    expect(result.user.isVerified).toBe(true);
    expect(context.prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isVerified: true }),
    }));
    expect(context.mail.sendVerificationEmail).toHaveBeenCalledWith(
      dto.email,
      dto.name,
      expect.stringMatching(/^https:\/\/demo\.gandira\.test\/auth\/verify-email\?token=/),
    );
    expect(logger).toHaveBeenCalledWith(expect.stringContaining('[DEMO EMAIL MODE] Confirmação de e-mail'));
    expect(logger).toHaveBeenCalledWith(expect.stringContaining('Destinatário: r***@e***.com'));
  });

  it('preserva cadastro não verificado quando DEMO_EMAIL_MODE=false', async () => {
    const context = setup(jest.fn(), { DEMO_EMAIL_MODE: 'false' });

    const result = await context.service.register({ ...dto, invitationToken: undefined });

    expect(result.user.isVerified).toBe(false);
    expect(context.prisma.user.create.mock.calls[0][0].data).not.toHaveProperty('isVerified');
  });

  it('conclui convite criando o destinatário já verificado no modo demo', async () => {
    const completion = { transfer: { id: 'transfer-1' }, user: { id: 'user-new', email: dto.email, name: dto.name } };
    const completeInvite = jest.fn().mockResolvedValue(completion);
    const context = setup(completeInvite, { DEMO_EMAIL_MODE: 'true' });

    const result = await context.service.register(dto);

    expect(result.user.isVerified).toBe(true);
    expect(completeInvite).toHaveBeenCalled();
    expect(context.transfers.notifyInviteCompleted).toHaveBeenCalledWith(completion.transfer, completion.user);
  });

  it('reverte usuário, audit log e token de verificação quando completeInvite falha', async () => {
    const context = setup(jest.fn().mockRejectedValue(new ConflictException('claim perdido')));

    await expect(context.service.register(dto)).rejects.toThrow('claim perdido');
    expect(context.committedUsers).toHaveLength(0);
    expect(context.tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(context.tx.emailVerificationToken.create).toHaveBeenCalledTimes(1);
    expect(context.tx.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(context.mail.sendVerificationEmail).not.toHaveBeenCalled();
    expect(context.prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('mantém o commit quando o e-mail falha depois da transação', async () => {
    const completion = { transfer: { id: 'transfer-1' }, user: { id: 'user-new', email: dto.email, name: dto.name } };
    const context = setup(jest.fn().mockResolvedValue(completion));
    context.mail.sendVerificationEmail.mockRejectedValue(new Error('mail unavailable'));

    await expect(context.service.register(dto)).resolves.toMatchObject({ user: { id: 'user-new' } });
    expect(context.committedUsers).toHaveLength(1);
    expect(context.transfers.notifyInviteCompleted).toHaveBeenCalledWith(completion.transfer, completion.user);
    expect(context.tx.refreshToken.create).toHaveBeenCalledTimes(1);
    expect(context.prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('reverte o cadastro convidado quando a assinatura do access token falha', async () => {
    const context = setup(jest.fn());
    context.jwt.signAsync.mockRejectedValue(new Error('jwt unavailable'));

    await expect(context.service.register(dto)).rejects.toThrow('jwt unavailable');
    expect(context.committedUsers).toHaveLength(0);
    expect(context.tx.refreshToken.create).not.toHaveBeenCalled();
    expect(context.mail.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('reverte o cadastro convidado quando a persistência do refresh token falha', async () => {
    const context = setup(jest.fn());
    context.tx.refreshToken.create.mockRejectedValue(new Error('refresh unavailable'));

    await expect(context.service.register(dto)).rejects.toThrow('refresh unavailable');
    expect(context.committedUsers).toHaveLength(0);
    expect(context.transfers.completeInviteInTransaction).not.toHaveBeenCalled();
    expect(context.mail.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
