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

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
    private ticketTransfers: TicketTransfersService,
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
      token: generateSecureToken(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    } : null;
    const preparedRefresh = dto.invitationToken ? {
      token: generateSecureToken(40),
      expiresAt: this.refreshTokenExpiresAt(),
    } : null;
    let completedInvite: Awaited<ReturnType<TicketTransfersService['completeInviteInTransaction']>> | null = null;
    let invitedTokens: { accessToken: string; refreshToken: string } | null = null;

    const createUser = async (db: Prisma.TransactionClient | PrismaService) => db.user.create({
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
        select: { id: true, email: true, name: true, role: true, isVerified: true },
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
          await this.persistVerificationToken(tx, created.id, preparedVerification.token, preparedVerification.expiresAt);
          await tx.refreshToken.create({ data: { userId: created.id, token: preparedRefresh.token, expiresAt: preparedRefresh.expiresAt } });
          const inviteCompletion = await this.ticketTransfers.completeInviteInTransaction(
            tx,
            dto.invitationToken!,
            created,
            preparedInvite,
          );
          return { user: created, completedInvite: inviteCompletion, accessToken };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
      user = registration.user;
      completedInvite = registration.completedInvite;
      invitedTokens = { accessToken: registration.accessToken, refreshToken: preparedRefresh.token };
    } else {
      user = await createUser(this.prisma);
    }

    this.logger.log(`New user registered: ${user.email}`);
    if (!dto.invitationToken) {
      await this.auditLog(user.id, 'USER_REGISTERED', 'User', user.id);
      await this.dispatchVerificationEmail(user.id, user.email, user.name);
    } else {
      this.sendVerificationEmail(user.email, user.name, preparedVerification!.token);
    }
    if (completedInvite) this.ticketTransfers.notifyInviteCompleted(completedInvite.transfer, completedInvite.user);

    const tokens = invitedTokens ?? await this.generateTokenPair(user.id, user.email, user.role);
    return { user, ...tokens };
  }

  async verifyEmail(token: string) {
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!record || record.usedAt) throw new BadRequestException('Token inválido ou já utilizado');
    if (record.expiresAt < new Date()) throw new BadRequestException('Token expirado. Solicite um novo link.');

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { isVerified: true } }),
      this.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return { message: 'E-mail verificado com sucesso!' };
  }

  async resendVerificationByEmail(email: string) {
    if (!email) throw new BadRequestException('E-mail obrigatório');
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true, isVerified: true, isActive: true },
    });
    // Always return 200 to avoid enumeration
    if (!user || !user.isActive || user.isVerified) return { message: 'E-mail de verificação reenviado.' };

    await this.dispatchVerificationEmail(user.id, user.email, user.name);
    return { message: 'E-mail de verificação reenviado.' };
  }

  private async dispatchVerificationEmail(userId: string, email: string, name: string) {
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.persistVerificationToken(this.prisma, userId, token, expiresAt, true);
    this.sendVerificationEmail(email, name, token);
  }

  private async persistVerificationToken(
    db: Prisma.TransactionClient | PrismaService,
    userId: string,
    token: string,
    expiresAt: Date,
    replaceExisting = false,
  ) {
    if (replaceExisting) await db.emailVerificationToken.deleteMany({ where: { userId } });
    await db.emailVerificationToken.create({ data: { userId, token, expiresAt } });
  }

  private sendVerificationEmail(email: string, name: string, token: string) {
    const baseUrl = (this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')).split(',')[0].trim();
    const verifyUrl = `${baseUrl}/auth/verify-email?token=${token}`;
    if (isDemoEmailMode(this.config)) {
      this.logger.log(`[DEMO EMAIL MODE] Confirmação de e-mail\nDestinatário: ${maskEmail(email)}\nLink: ${verifyUrl}`);
    }
    this.mail.sendVerificationEmail(email, name, verifyUrl)
      .catch(err => this.logger.error(`Falha ao enviar e-mail de verificação para ${email}: ${err.message}`));
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
      user: { id: user.id, email: user.email, name: user.name, role: user.role, isVerified: user.isVerified },
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
    if (!user || !user.isActive) return;

    // Invalidate any existing unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const frontendUrl = (this.config.get<string>('FRONTEND_URL', 'http://localhost:3000')).split(',')[0].trim();
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    await this.mail.sendPasswordReset(user.email, user.name, resetUrl);
    this.logger.log(`Password reset requested for ${user.email}`);
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

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
