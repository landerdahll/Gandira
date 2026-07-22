import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { maskEmail } from '../../common/utils/demo-email.util';
import { CreateClubMemberDto } from './dto/create-club-member.dto';

@Injectable()
export class ClubMembersService {
  private readonly logger = new Logger(ClubMembersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 20, search?: string) {
    const take = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const normalizedSearch = search?.trim();
    const digitSearch = normalizedSearch?.replace(/\D/g, '') ?? '';
    const where: Prisma.ClubMemberWhereInput = normalizedSearch
      ? {
          OR: [
            ...(digitSearch ? [
              { phone: { contains: digitSearch } },
            ] : []),
            { name: { contains: normalizedSearch, mode: 'insensitive' } },
            { email: { contains: normalizedSearch, mode: 'insensitive' } },
          ],
        }
      : {};

    const [members, total, statusCounts] = await Promise.all([
      this.prisma.clubMember.findMany({
        where,
        skip: (safePage - 1) * take,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clubMember.count({ where }),
      this.prisma.clubMember.groupBy({
        by: ['isActive'],
        _count: { _all: true },
      }),
    ]);

    const linkedAccounts = await this.findLinkedAccounts(members.map(({ email }) => email));
    const active = statusCounts.find(({ isActive }) => isActive)?._count._all ?? 0;
    const inactive = statusCounts.find(({ isActive }) => !isActive)?._count._all ?? 0;
    return {
      data: members.map((member) => this.withLinkedAccount(member, linkedAccounts)),
      meta: { total, page: safePage, lastPage: Math.ceil(total / take) },
      summary: { active, inactive, total: active + inactive },
    };
  }

  async findOne(id: string) {
    const member = await this.prisma.clubMember.findUnique({
      where: { id },
      include: {
        usages: {
          orderBy: { createdAt: 'desc' },
          include: {
            event: { select: { id: true, title: true } },
            batch: { select: { id: true, name: true } },
            reservedOrder: { select: { id: true, status: true } },
            confirmedOrder: { select: { id: true, status: true } },
          },
        },
      },
    });
    if (!member) throw new NotFoundException('Membro do Clube Outrahora não encontrado');
    const accounts = await this.findLinkedAccounts([member.email]);
    return this.withLinkedAccount(member, accounts);
  }

  async create(dto: CreateClubMemberDto, adminUserId: string) {
    const email = this.normalizeEmail(dto.email);

    try {
      const member = await this.prisma.$transaction(async (tx) => {
        const created = await tx.clubMember.create({
          data: {
            email,
            name: this.optionalText(dto.name),
            phone: dto.phone?.replace(/\D/g, '') || null,
            discountPercentage: this.parseDiscountPercentage(dto.discountPercentage ?? '10.00'),
            isActive: true,
            activatedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: 'CLUB_MEMBER_CREATED',
            entity: 'ClubMember',
            entityId: created.id,
            metadata: { email: maskEmail(email), isActive: true },
          },
        });
        return created;
      });
      this.logger.log(`Membro do Clube criado: ${maskEmail(email)}`);
      return this.findOne(member.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('E-mail já cadastrado no Clube Outrahora');
      }
      throw error;
    }
  }

  activate(id: string, adminUserId: string) {
    return this.changeStatus(id, true, adminUserId);
  }

  deactivate(id: string, adminUserId: string) {
    return this.changeStatus(id, false, adminUserId);
  }

  async updateDiscount(id: string, value: string, adminUserId: string) {
    const discountPercentage = this.parseDiscountPercentage(value);
    const member = await this.prisma.clubMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Membro do Clube Outrahora não encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.clubMember.update({ where: { id }, data: { discountPercentage } });
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'CLUB_MEMBER_DISCOUNT_UPDATED',
          entity: 'ClubMember',
          entityId: id,
          metadata: {
            email: maskEmail(member.email),
            previousDiscountPercentage: member.discountPercentage.toFixed(2),
            newDiscountPercentage: discountPercentage.toFixed(2),
          },
        },
      });
    });

    this.logger.log(`Desconto do membro do Clube alterado: ${maskEmail(member.email)}`);
    return this.findOne(id);
  }

  private async changeStatus(id: string, isActive: boolean, adminUserId: string) {
    const member = await this.prisma.clubMember.findUnique({ where: { id } });
    if (!member) throw new NotFoundException('Membro do Clube Outrahora não encontrado');
    if (member.isActive === isActive) return this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.clubMember.update({
        where: { id },
        data: isActive
          ? { isActive: true, activatedAt: new Date(), deactivatedAt: null }
          : { isActive: false, deactivatedAt: new Date() },
      });

      if (!isActive) {
        await tx.clubBenefitUsage.updateMany({
          where: { clubMemberId: id, status: 'RESERVED' },
          data: {
            status: 'RELEASED',
            releasedAt: new Date(),
            releaseReason: 'MEMBER_DEACTIVATED',
            reservedOrderId: null,
            reservationExpiresAt: null,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: isActive ? 'CLUB_MEMBER_ACTIVATED' : 'CLUB_MEMBER_DEACTIVATED',
          entity: 'ClubMember',
          entityId: id,
          metadata: { email: maskEmail(member.email), isActive },
        },
      });
    });

    this.logger.log(`Membro do Clube ${isActive ? 'ativado' : 'desativado'}: ${maskEmail(member.email)}`);
    return this.findOne(id);
  }

  private async findLinkedAccounts(memberEmails: string[]) {
    const emails = [...new Set(memberEmails.map((email) => this.normalizeEmail(email)))];
    if (emails.length === 0) return new Map<string, { id: string; name: string; email: string; isActive: boolean }>();
    const users = await this.prisma.user.findMany({
      where: {
        OR: emails.map((email) => ({ email: { contains: email, mode: 'insensitive' as const } })),
      },
      select: { id: true, name: true, email: true, isActive: true },
    });
    return new Map(users
      .filter((user) => emails.includes(this.normalizeEmail(user.email)))
      .map((user) => [this.normalizeEmail(user.email), {
        id: user.id, name: user.name, email: user.email, isActive: user.isActive,
      }]));
  }

  private withLinkedAccount<T extends { email: string }>(
    member: T,
    accounts: Map<string, { id: string; name: string; email: string; isActive: boolean }>,
  ) {
    const linkedAccount = accounts.get(this.normalizeEmail(member.email)) ?? null;
    return { ...member, hasLinkedAccount: Boolean(linkedAccount), linkedAccount };
  }

  private optionalText(value?: string) {
    return value?.trim() || null;
  }

  private normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  private parseDiscountPercentage(value: string) {
    if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(value)) {
      throw new BadRequestException('O percentual de desconto deve ser um decimal entre 0,01 e 99,99, com até duas casas decimais');
    }
    const percentage = new Prisma.Decimal(value);
    if (percentage.lt(new Prisma.Decimal('0.01')) || percentage.gt(new Prisma.Decimal('99.99'))) {
      throw new BadRequestException('O percentual de desconto deve estar entre 0,01 e 99,99');
    }
    return percentage;
  }
}
