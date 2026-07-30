import { Injectable, NotFoundException, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { IsOptional, IsString, IsEnum, IsDateString, MaxLength, IsEmail, MinLength, Matches } from 'class-validator';
import { Gender, Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

const BCRYPT_ROUNDS = 12;
export const TEST_MEMBER_EMAILS = [
  'will3@gmail.com', 'will2@gmail.com', 'leozinvasquez@gmail.com',
  'cliente@pago.test', 'camila.teste@outrahora.com', 'cliente@outrahora.com',
] as const;

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @Matches(/^\(\d{2}\) \d{9}$/, { message: 'Celular inválido' }) phone?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsDateString() birthDate?: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) @Matches(/[A-Z]/, { message: 'Deve ter ao menos 1 letra maiúscula' }) @Matches(/\d/, { message: 'Deve ter ao menos 1 número' }) newPassword: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, gender: true, birthDate: true, avatarUrl: true, isVerified: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const clubMember = await this.prisma.clubMember.findUnique({
      where: { email: user.email.trim().toLowerCase() },
      select: { isActive: true, discountPercentage: true },
    });
    const isMember = Boolean(clubMember);
    const isActive = clubMember?.isActive ?? false;

    return {
      ...user,
      clubMembership: {
        isMember,
        isActive,
        canUseBenefit: isMember && isActive,
        discountPercentage: clubMember?.discountPercentage.toFixed(2) ?? null,
        label: 'Clube Outrahora',
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
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
        throw new BadRequestException('Você deve ter ao menos 14 anos');
      }
    }
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase().trim(), NOT: { id: userId } },
      });
      if (existing) throw new ConflictException('E-mail já está em uso');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        email: dto.email ? dto.email.toLowerCase().trim() : undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, gender: true, birthDate: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta');

    const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return { message: 'Senha alterada com sucesso' };
  }

  async updateAvatarUrl(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  }

  async removeAvatarUrl(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: { id: true, avatarUrl: true },
    });
  }

  async promoteToProducer(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.PRODUCER },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async promoteToStaff(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.STAFF },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async demoteToCustomer(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.CUSTOMER },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async listAll(page = 1, limit = 50, search?: string, role?: Role) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const roleFilter = role ? { role } : {};
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const where = search && role
      ? { AND: [roleFilter, searchFilter] }
      : { ...roleFilter, ...searchFilter };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, phone: true,
          role: true, gender: true, birthDate: true,
          isVerified: true, isActive: true, createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / take) } };
  }

  async resetUserPassword(userId: string) {
    const tempPassword = 'Senha@123';
    const hashed = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: `Senha redefinida para: ${tempPassword}` };
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.deleteMany({ where: { userId } }),
      this.prisma.passwordResetToken.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `deleted_${userId}@deleted.local`,
          name: 'Conta excluída',
          phone: null,
          cpf: null,
          avatarUrl: null,
          isActive: false,
          isVerified: false,
        },
      }),
    ]);

    return { message: 'Usuário excluído com sucesso' };
  }

  async purgeTestMembers() {
    return this.prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: { email: { in: [...TEST_MEMBER_EMAILS] } },
        select: { id: true, email: true, name: true, events: { select: { id: true } } },
      });
      const protectedUser = await tx.user.findFirst({
        where: { OR: [{ name: 'Teste Usuario' }, { email: 'teste@teste.com' }] },
        select: { id: true, email: true, name: true },
      });
      const producers = users.filter((user) => user.events.length > 0);
      if (producers.length) {
        throw new BadRequestException(`Limpeza interrompida: usuário(s) possuem eventos: ${producers.map(({ email }) => email).join(', ')}`);
      }

      const userIds = users.map(({ id }) => id);
      const emails = users.map(({ email }) => email);
      const orders = userIds.length ? await tx.order.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, couponId: true, status: true, items: { select: { batchId: true, quantity: true } } },
      }) : [];
      const orderIds = orders.map(({ id }) => id);
      const tickets = userIds.length ? await tx.ticket.findMany({
        where: { OR: [{ ownerUserId: { in: userIds } }, { orderId: { in: orderIds } }] },
        select: { id: true, batchId: true, orderId: true },
      }) : [];
      const ticketIds = tickets.map(({ id }) => id);
      const transfers = userIds.length ? await tx.ticketTransfer.findMany({
        where: { OR: [
          { ticketId: { in: ticketIds } }, { senderUserId: { in: userIds } }, { recipientUserId: { in: userIds } },
        ] }, select: { id: true },
      }) : [];
      const transferIds = transfers.map(({ id }) => id);
      const clubMembers = emails.length ? await tx.clubMember.findMany({
        where: { email: { in: emails } }, select: { id: true },
      }) : [];
      const clubMemberIds = clubMembers.map(({ id }) => id);

      const batchCounts = new Map<string, number>();
      const releasedStatuses = new Set(['CANCELLED', 'EXPIRED', 'REFUNDED']);
      for (const order of orders) {
        if (releasedStatuses.has(order.status)) continue;
        for (const item of order.items) batchCounts.set(item.batchId, (batchCounts.get(item.batchId) ?? 0) + item.quantity);
      }
      const targetOrderIds = new Set(orderIds);
      for (const ticket of tickets) {
        if (!targetOrderIds.has(ticket.orderId)) batchCounts.set(ticket.batchId, (batchCounts.get(ticket.batchId) ?? 0) + 1);
      }
      for (const [batchId, count] of batchCounts) {
        const result = await tx.batch.updateMany({
          where: { id: batchId, sold: { gte: count } }, data: { sold: { decrement: count }, status: 'ACTIVE' },
        });
        if (result.count !== 1) throw new BadRequestException(`Contador inconsistente no lote ${batchId}`);
      }
      const couponCounts = new Map<string, number>();
      for (const order of orders) {
        if (!order.couponId || releasedStatuses.has(order.status)) continue;
        const quantity = order.items.reduce((total, item) => total + item.quantity, 0);
        couponCounts.set(order.couponId, (couponCounts.get(order.couponId) ?? 0) + quantity);
      }
      for (const [couponId, count] of couponCounts) {
        const result = await tx.coupon.updateMany({ where: { id: couponId, usedCount: { gte: count } }, data: { usedCount: { decrement: count } } });
        if (result.count !== 1) throw new BadRequestException(`Contador inconsistente no cupom ${couponId}`);
      }

      await tx.clubBenefitUsage.deleteMany({ where: { OR: [
        { clubMemberId: { in: clubMemberIds } }, { reservedOrderId: { in: orderIds } },
        { confirmedOrderId: { in: orderIds } }, { ticketId: { in: ticketIds } },
      ] } });
      await tx.ticketHistory.deleteMany({ where: { OR: [
        { ticketId: { in: ticketIds } }, { transferId: { in: transferIds } }, { actorUserId: { in: userIds } },
      ] } });
      await tx.checkIn.deleteMany({ where: { OR: [{ ticketId: { in: ticketIds } }, { staffId: { in: userIds } }] } });
      await tx.ticketTransfer.deleteMany({ where: { id: { in: transferIds } } });
      await tx.ticket.deleteMany({ where: { id: { in: ticketIds } } });
      await (tx as any).refund.deleteMany({ where: { OR: [{ orderId: { in: orderIds } }, { userId: { in: userIds } }] } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
      await tx.auditLog.deleteMany({ where: { OR: [
        { userId: { in: userIds } },
        { entityId: { in: [...userIds, ...orderIds, ...ticketIds, ...transferIds, ...clubMemberIds] } },
      ] } });
      await tx.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.emailVerificationToken.deleteMany({ where: { userId: { in: userIds } } });
      await tx.clubMember.deleteMany({ where: { id: { in: clubMemberIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });

      const remaining = await this.countTestMemberRelations(tx, userIds, emails, orderIds, ticketIds);
      if (Object.values(remaining).some((count) => count !== 0)) {
        throw new BadRequestException(`Limpeza incompleta: ${JSON.stringify(remaining)}`);
      }
      return {
        removedUsers: users.map(({ id, email, name }) => ({ id, email, name })),
        missingEmails: TEST_MEMBER_EMAILS.filter((email) => !emails.includes(email)),
        removed: { orders: orderIds.length, tickets: ticketIds.length, transfers: transferIds.length, clubMembers: clubMemberIds.length },
        protectedUser, integrity: remaining,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 });
  }

  private async countTestMemberRelations(tx: Prisma.TransactionClient, userIds: string[], emails: string[], orderIds: string[], ticketIds: string[]) {
    const [users, orders, tickets, checkIns, refunds, transfers, auditLogs, tokens, clubMembers] = await Promise.all([
      tx.user.count({ where: { id: { in: userIds } } }),
      tx.order.count({ where: { OR: [{ id: { in: orderIds } }, { userId: { in: userIds } }] } }),
      tx.ticket.count({ where: { OR: [{ id: { in: ticketIds } }, { ownerUserId: { in: userIds } }] } }),
      tx.checkIn.count({ where: { OR: [{ ticketId: { in: ticketIds } }, { staffId: { in: userIds } }] } }),
      (tx as any).refund.count({ where: { OR: [{ orderId: { in: orderIds } }, { userId: { in: userIds } }] } }),
      tx.ticketTransfer.count({ where: { OR: [{ senderUserId: { in: userIds } }, { recipientUserId: { in: userIds } }] } }),
      tx.auditLog.count({ where: { userId: { in: userIds } } }),
      tx.refreshToken.count({ where: { userId: { in: userIds } } }),
      tx.clubMember.count({ where: { email: { in: emails } } }),
    ]);
    return { users, orders, tickets, checkIns, refunds, transfers, auditLogs, tokens, clubMembers };
  }
}
