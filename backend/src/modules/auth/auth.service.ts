import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { generateSecureToken } from '../../common/utils/crypto.util';
import { MailService } from '../mail/mail.service';
import { TicketTransfersService } from '../ticket-transfers/ticket-transfers.service';
import { Prisma } from '@prisma/client';
import { withSerializableRetry } from '../../common/utils/serializable-retry.util';
import { isDemoEmailMode, maskEmail } from '../../common/utils/demo-email.util';
import { randomUUID } from 'crypto';
import { EmailOutboxService } from '../mail/email-outbox.service';
import { EmailTokenService } from '../mail/email-token.service';
import { getPublicFrontendUrl } from '../../common/utils/public-url.util';

const BCRYPT_ROUNDS = 12;

type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  platformRole: 'MEMBER' | 'SUPER_ADMIN';
  isVerified: boolean;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
    private ticketTransfers: TicketTransfersService,
    private outbox?: EmailOutboxService,
    private emailTokens?: EmailTokenService,
  ) {}

  async register(dto: RegisterDto) {
    const demoEmailMode = isDemoEmailMode(this.config);
    this.logger.log(`[DEMO EMAIL MODE] Ativo: ${demoEmailMode}`);
    const normalizedEmail = dto.email.toLowerCase().trim();
    const preparedInvite = dto.invitationToken
      ? await this.ticketTransfers.prepareInviteCompletion(dto.invitationToken, normalizedEmail)
      : null;
    const exists = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) throw new ConflictException('E-mail já cadastrado');

    if (dto.cpf) {
      const cpfExists = await this.prisma.user.findUnique({
        where: { cpf: dto.cpf.replace(/\D/g, '') },
      });
      if (cpfExists) throw new ConflictException('CPF já cadastrado');
    }

    if (dto.birthDate) {
      const birth = new Date(dto.birthDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(birth.getTime()) || birth >= today) {
        throw new BadRequestException('Data de nascimento inválida');
      }
      const age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      const exactAge = age - (m < 0 || (m === 0 && today.getDate() < birth.getDate()) ? 1 : 0);
      if (exactAge < 14) {
        throw new BadRequestException('Você deve ter ao menos 14 anos para se cadastrar');
      }
    }

    const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const cpf = dto.cpf ? dto.cpf.replace(/\D/g, '') : undefined;
    const preparedVerification = dto.invitationToken ? {
      id: randomUUID(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    } : null;
    const preparedRefresh = dto.invitationToken ? {
      token: generateSecureToken(40),
      expiresAt: this.refreshTokenExpiresAt(),
    } : null;
    let invitedTokens: { accessToken: string; refreshToken: string } | null = null;

    const createUser = async (db: Prisma.TransactionClient | PrismaService): Promise<AuthenticatedUser> => (db.user.create as any)({
        data: {
          name: dto.name,
          email: normalizedEmail,
          password,
          phone: dto.phone,
          cpf,
          gender: dto.gender,
          birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
          ...(demoEmailMode ? { isVerified: true } : {}),
        },
        select: { id: true, email: true, name: true, role: true, platformRole: true, isVerified: true },
      });

    let user: Awaited<ReturnType<typeof createUser>>;
    if (dto.invitationToken && preparedInvite && preparedVerification && preparedRefresh) {
      const registration = await withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
          const invite = await tx.ticketTransfer.findUnique({
            where: { invitationTokenHash: this.ticketTransfers.hashInviteToken(dto.invitationToken!) },
            select: { status: true, expiresAt: true, recipientEmail: true },
          });
          if (!invite || invite.status !== 'PENDING_REGISTRATION' || !invite.expiresAt || invite.expiresAt <= new Date()) {
            throw new BadRequestException('Convite inválido ou expirado');
          }
          if (invite.recipientEmail.toLowerCase().trim() !== normalizedEmail) {
            throw new BadRequestException('O e-mail deve ser o mesmo do convite');
          }

          if (await tx.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } })) {
            throw new ConflictException('E-mail já cadastrado');
          }
          if (cpf && await tx.user.findUnique({ where: { cpf }, select: { id: true } })) {
            throw new ConflictException('CPF já cadastrado');
          }

          const created = await createUser(tx);
          const accessToken = await this.jwt.signAsync({ sub: created.id, email: created.email, role: created.role });
          await this.auditLog(created.id, 'USER_REGISTERED', 'User', created.id, undefined, tx);
          await this.persistVerificationToken(tx, created.id, preparedVerification.id, preparedVerification.expiresAt);
          await tx.refreshToken.create({ data: { userId: created.id, token: preparedRefresh.token, expiresAt: preparedRefresh.expiresAt } });
          await this.ticketTransfers.linkInviteToUnverifiedUserInTransaction(tx, dto.invitationToken!, created);
          await this.enqueueVerification(tx, preparedVerification.id, created.email, created.name);
          return { user: created, accessToken };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
      user = registration.user;
      invitedTokens = { accessToken: registration.accessToken, refreshToken: preparedRefresh.token };
    } else {
      user = await createUser(this.prisma);
    }

    this.logger.log(`New user registered: ${user.email}`);
    if (!dto.invitationToken) {
      await this.auditLog(user.id, 'USER_REGISTERED', 'User', user.id);
      await this.dispatchVerificationEmail(user.id, user.email, user.name);
    } else {
      // O e-mail já foi registrado na outbox dentro da transação do convite.
    }

    const tokens = invitedTokens ?? await this.generateTokenPair(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async verifyEmail(token: string) {
    const recordId = token.split('.')[0];
    const hashedRecord = recordId ? await this.prisma.emailVerificationToken.findUnique({ where: { id: recordId }, include: { user: { select: { isVerified: true } } } }) : null;
    // Transição expand/contract: novos links sempre validam tokenHash. O fallback
    // abaixo aceita somente registros legados já existentes; nenhum token novo é
    // persistido em texto puro e o fallback desaparece na migration de limpeza.
    const record = hashedRecord?.tokenHash && this.tokenService.matches(token, hashedRecord.tokenHash)
      ? hashedRecord
      : await this.prisma.emailVerificationToken.findFirst({ where: { token }, include: { user: { select: { isVerified: true } } } });
    if (!record) throw new BadRequestException('Token inválido');
    if (record.usedAt && record.user.isVerified) return { message: 'E-mail já confirmado.', alreadyConfirmed: true, ticketTransfersCompleted: 0 };
    if (record.usedAt) throw new BadRequestException('Token já utilizado');
    if (record.expiresAt < new Date()) throw new BadRequestException('Token expirado. Solicite um novo link.');

    const ticketTransfersCompleted = await this.prisma.$transaction(async tx => {
      const user = await tx.user.update({ where: { id: record.userId }, data: { isVerified: true }, select: { id: true, email: true, name: true } });
      await tx.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
      return this.ticketTransfers.completePendingVerificationForUserInTransaction(tx, user);
    });

    return { message: 'E-mail verificado com sucesso!', ticketTransfersCompleted };
  }

  async resendVerificationByEmail(email: string) {
    if (!email) throw new BadRequestException('E-mail obrigatório');
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true, isVerified: true, isActive: true, verificationEmailLastSentAt: true },
    });
    // Always return 200 to avoid enumeration
    if (!user || !user.isActive || user.isVerified) return { message: 'E-mail de verificação reenviado.' };

    if (!this.cooldownElapsed(user.verificationEmailLastSentAt)) return { message: 'E-mail de verificação reenviado.' };
    await this.dispatchVerificationEmail(user.id, user.email, user.name);
    return { message: 'E-mail de verificação reenviado.' };
  }

  private async dispatchVerificationEmail(userId: string, email: string, name: string) {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.$transaction(async tx => {
      await this.persistVerificationToken(tx, userId, id, expiresAt, true);
      await tx.user.update({ where: { id: userId }, data: { verificationEmailLastSentAt: new Date() } });
      await this.enqueueVerification(tx, id, email, name);
    });
  }

  private async persistVerificationToken(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    id: string,
    expiresAt: Date,
    replaceExisting = false,
  ) {
    if (replaceExisting) await db.emailVerificationToken.deleteMany({ where: { userId } });
    await db.emailVerificationToken.create({ data: { id, userId, tokenHash: this.tokenService.hashForRecord(id, 'email-verification'), expiresAt } });
  }

  private enqueueVerification(db: Prisma.TransactionClient, id: string, email: string, name: string) {
    if (!this.outbox) return this.mail.sendVerificationEmail(email, name, `${getPublicFrontendUrl(this.config)}/auth/verify-email?token=${this.tokenService.reconstruct(id, 'email-verification')}`) as any;
    return this.outbox.enqueue({ type: 'EMAIL_VERIFICATION', recipient: email, template: 'EMAIL_VERIFICATION',
      payload: { name, tokenRecordId: id, tokenPurpose: 'email-verification', tokenPath: '/auth/verify-email' },
      idempotencyKey: `EMAIL_VERIFICATION:${id}`, relatedEntityType: 'EmailVerificationToken', relatedEntityId: id }, db);
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // Always run bcrypt even when user not found — prevents timing attacks
    const dummyHash = '$2b$12$invalid.hash.for.timing.safety.do.not.remove';
    const isValid = user
      ? await bcrypt.compare(dto.password, user.password)
      : await bcrypt.compare(dto.password, dummyHash);

    if (!user || !isValid || !user.isActive) {
      await this.auditLog(null, 'LOGIN_FAILED', 'User', dto.email, { ipAddress });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    this.logger.log(`User login: ${user.email}`);
    await this.auditLog(user.id, 'LOGIN_SUCCESS', 'User', user.id, { ipAddress });

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, platformRole: (user as any).platformRole, isVerified: user.isVerified },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    // Rotate: revoke old token, issue new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { isRevoked: true },
    });

    return this.generateTokenPair(stored.user.id, stored.user.email, stored.user.role);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { isRevoked: true },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return 200 — don't leak whether email exists
    if (!user || !user.isActive || !this.cooldownElapsed(user.passwordResetLastSentAt)) return;

    // Invalidate any existing unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.prisma.$transaction(async tx => {
      await tx.passwordResetToken.create({ data: { id, userId: user.id, tokenHash: this.tokenService.hashForRecord(id, 'password-reset'), expiresAt } });
      await tx.user.update({ where: { id: user.id }, data: { passwordResetLastSentAt: new Date() } });
      if (this.outbox) await this.outbox.enqueue({ type: 'PASSWORD_RESET', recipient: user.email, template: 'PASSWORD_RESET',
        payload: { name: user.name, tokenRecordId: id, tokenPurpose: 'password-reset', tokenPath: '/auth/reset-password' },
        idempotencyKey: `PASSWORD_RESET:${id}`, relatedEntityType: 'PasswordResetToken', relatedEntityId: id }, tx);
    });
    this.logger.log(`Password reset requested for ${user.email}`);
  }

  async resetPassword(token: string, newPassword: string) {
    const recordId = token.split('.')[0];
    const hashedRecord = recordId ? await this.prisma.passwordResetToken.findUnique({
      where: { id: recordId },
      include: { user: true },
    }) : null;
    const record = hashedRecord?.tokenHash && this.tokenService.matches(token, hashedRecord.tokenHash)
      ? hashedRecord
      : await this.prisma.passwordResetToken.findFirst({ where: { token }, include: { user: true } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Link inválido ou expirado');
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all refresh tokens — force re-login
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId },
        data: { isRevoked: true },
      }),
    ]);

    this.logger.log(`Password reset completed for user ${record.userId}`);
    await this.auditLog(record.userId, 'PASSWORD_RESET', 'User', record.userId);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private async generateTokenPair(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload),
      generateSecureToken(40),
    ]);

    const expiresAt = this.refreshTokenExpiresAt();

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private refreshTokenExpiresAt() {
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const days = parseInt(refreshExpiresIn);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  private cooldownElapsed(lastSentAt?: Date | null) {
    return !lastSentAt || Date.now() - lastSentAt.getTime() >= 60_000;
  }

  private get tokenService() { return this.emailTokens ?? new EmailTokenService(this.config); }

  private async auditLog(
    userId: string | null,
    action: string,
    entity: string,
    entityId?: string,
    metadata?: Record<string, any>,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    await db.auditLog.create({
      data: { userId, action, entity, entityId, metadata },
    });
  }
}
