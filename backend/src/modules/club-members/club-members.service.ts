import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { isValidCpf, maskCpf, normalizeCpf } from '../../common/utils/cpf.util';
import { CreateClubMemberDto } from './dto/create-club-member.dto';

@Injectable()
export class ClubMembersService {
  private readonly logger = new Logger(ClubMembersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 20, search?: string) {
    const take = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const normalizedSearch = search?.trim();
    const digitSearch = normalizedSearch ? normalizeCpf(normalizedSearch) : '';
    const where: Prisma.ClubMemberWhereInput = normalizedSearch
      ? {
          OR: [
            ...(digitSearch ? [
              { cpf: { contains: digitSearch } },
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

    const linkedAccounts = await this.findLinkedAccounts(members.map(({ cpf }) => cpf));
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
    const accounts = await this.findLinkedAccounts([member.cpf]);
    return this.withLinkedAccount(member, accounts);
  }

  async create(dto: CreateClubMemberDto, adminUserId: string) {
    const cpf = normalizeCpf(dto.cpf);
    if (!isValidCpf(cpf)) throw new BadRequestException('CPF inválido');

    try {
      const member = await this.prisma.$transaction(async (tx) => {
        const created = await tx.clubMember.create({
          data: {
            cpf,
            name: this.optionalText(dto.name),
            email: dto.email?.toLowerCase().trim() || null,
            phone: dto.phone ? normalizeCpf(dto.phone) : null,
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
            metadata: { cpf: maskCpf(cpf), isActive: true },
          },
        });
        return created;
      });
      this.logger.log(`Membro do Clube criado: ${maskCpf(cpf)}`);
      return this.findOne(member.id);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('CPF já cadastrado no Clube Outrahora');
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
          metadata: { cpf: maskCpf(member.cpf), isActive },
        },
      });
    });

    this.logger.log(`Membro do Clube ${isActive ? 'ativado' : 'desativado'}: ${maskCpf(member.cpf)}`);
    return this.findOne(id);
  }

  private async findLinkedAccounts(cpfs: string[]) {
    if (cpfs.length === 0) return new Map<string, { id: string; name: string; email: string; isActive: boolean }>();
    const users = await this.prisma.user.findMany({
      where: { cpf: { in: cpfs } },
      select: { id: true, cpf: true, name: true, email: true, isActive: true },
    });
    return new Map(users.filter((user) => user.cpf).map((user) => [user.cpf!, {
      id: user.id, name: user.name, email: user.email, isActive: user.isActive,
    }]));
  }

  private withLinkedAccount<T extends { cpf: string }>(
    member: T,
    accounts: Map<string, { id: string; name: string; email: string; isActive: boolean }>,
  ) {
    const linkedAccount = accounts.get(member.cpf) ?? null;
    return { ...member, hasLinkedAccount: Boolean(linkedAccount), linkedAccount };
  }

  private optionalText(value?: string) {
    return value?.trim() || null;
  }
}
