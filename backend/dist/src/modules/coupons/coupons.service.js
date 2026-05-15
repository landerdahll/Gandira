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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let CouponsService = class CouponsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(eventId, producerId, dto) {
        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event)
            throw new common_1.NotFoundException('Evento não encontrado');
        if (event.producerId !== producerId)
            throw new common_1.ForbiddenException('Acesso negado');
        const code = dto.code.toUpperCase().trim();
        const existing = await this.prisma.coupon.findUnique({
            where: { eventId_code: { eventId, code } },
        });
        if (existing)
            throw new common_1.ConflictException('Já existe um cupom com esse código para este evento');
        return this.prisma.coupon.create({
            data: {
                eventId,
                code,
                discount: dto.discount,
                maxUses: dto.maxUses ?? null,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
                isActive: true,
            },
        });
    }
    async list(eventId, producerId) {
        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event)
            throw new common_1.NotFoundException('Evento não encontrado');
        if (event.producerId !== producerId)
            throw new common_1.ForbiddenException('Acesso negado');
        return this.prisma.coupon.findMany({
            where: { eventId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async remove(eventId, couponId, producerId) {
        const coupon = await this.prisma.coupon.findUnique({
            where: { id: couponId },
            include: { event: { select: { producerId: true } } },
        });
        if (!coupon || coupon.eventId !== eventId)
            throw new common_1.NotFoundException('Cupom não encontrado');
        if (coupon.event.producerId !== producerId)
            throw new common_1.ForbiddenException('Acesso negado');
        await this.prisma.coupon.delete({ where: { id: couponId } });
    }
    async validate(eventId, code) {
        const coupon = await this.prisma.coupon.findUnique({
            where: { eventId_code: { eventId, code: code.toUpperCase().trim() } },
        });
        if (!coupon || !coupon.isActive)
            throw new common_1.BadRequestException('Cupom inválido');
        if (coupon.expiresAt && coupon.expiresAt < new Date())
            throw new common_1.BadRequestException('Cupom expirado');
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
            throw new common_1.BadRequestException('Cupom esgotado');
        return {
            id: coupon.id,
            code: coupon.code,
            discount: Number(coupon.discount),
            maxUses: coupon.maxUses,
            usedCount: coupon.usedCount,
        };
    }
};
exports.CouponsService = CouponsService;
exports.CouponsService = CouponsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CouponsService);
//# sourceMappingURL=coupons.service.js.map