"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ClubMembersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClubMembersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const cpf_util_1 = require("../../common/utils/cpf.util");
let ClubMembersService = ClubMembersService_1 = class ClubMembersService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(ClubMembersService_1.name);
    }
    async list(page = 1, limit = 20, search) {
        const take = Math.min(Math.max(limit, 1), 100);
        const safePage = Math.max(page, 1);
        const normalizedSearch = search?.trim();
        const digitSearch = normalizedSearch ? (0, cpf_util_1.normalizeCpf)(normalizedSearch) : '';
        const where = normalizedSearch
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
    async findOne(id) {
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
        if (!member)
            throw new common_1.NotFoundException('Membro do Clube Outrahora não encontrado');
        const accounts = await this.findLinkedAccounts([member.cpf]);
        return this.withLinkedAccount(member, accounts);
    }
    async create(dto, adminUserId) {
        const cpf = (0, cpf_util_1.normalizeCpf)(dto.cpf);
        if (!(0, cpf_util_1.isValidCpf)(cpf))
            throw new common_1.BadRequestException('CPF inválido');
        try {
            const member = await this.prisma.$transaction(async (tx) => {
                const created = await tx.clubMember.create({
                    data: {
                        cpf,
                        name: this.optionalText(dto.name),
                        email: dto.email?.toLowerCase().trim() || null,
                        phone: dto.phone ? (0, cpf_util_1.normalizeCpf)(dto.phone) : null,
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
                        metadata: { cpf: (0, cpf_util_1.maskCpf)(cpf), isActive: true },
                    },
                });
                return created;
            });
            this.logger.log(`Membro do Clube criado: ${(0, cpf_util_1.maskCpf)(cpf)}`);
            return this.findOne(member.id);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new common_1.ConflictException('CPF já cadastrado no Clube Outrahora');
            }
            throw error;
        }
    }
    activate(id, adminUserId) {
        return this.changeStatus(id, true, adminUserId);
    }
    deactivate(id, adminUserId) {
        return this.changeStatus(id, false, adminUserId);
    }
    async changeStatus(id, isActive, adminUserId) {
        const member = await this.prisma.clubMember.findUnique({ where: { id } });
        if (!member)
            throw new common_1.NotFoundException('Membro do Clube Outrahora não encontrado');
        if (member.isActive === isActive)
            return this.findOne(id);
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
                    metadata: { cpf: (0, cpf_util_1.maskCpf)(member.cpf), isActive },
                },
            });
        });
        this.logger.log(`Membro do Clube ${isActive ? 'ativado' : 'desativado'}: ${(0, cpf_util_1.maskCpf)(member.cpf)}`);
        return this.findOne(id);
    }
    async findLinkedAccounts(cpfs) {
        if (cpfs.length === 0)
            return new Map();
        const users = await this.prisma.user.findMany({
            where: { cpf: { in: cpfs } },
            select: { id: true, cpf: true, name: true, email: true, isActive: true },
        });
        return new Map(users.filter((user) => user.cpf).map((user) => [user.cpf, {
                id: user.id, name: user.name, email: user.email, isActive: user.isActive,
            }]));
    }
    withLinkedAccount(member, accounts) {
        const linkedAccount = accounts.get(member.cpf) ?? null;
        return { ...member, hasLinkedAccount: Boolean(linkedAccount), linkedAccount };
    }
    optionalText(value) {
        return value?.trim() || null;
    }
};
exports.ClubMembersService = ClubMembersService;
exports.ClubMembersService = ClubMembersService = ClubMembersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClubMembersService);
//# sourceMappingURL=club-members.service.js.map