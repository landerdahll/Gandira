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
exports.BatchesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let BatchesService = class BatchesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(eventId, dto, producerId) {
        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event)
            throw new common_1.NotFoundException('Evento não encontrado');
        if (event.producerId !== producerId)
            throw new common_1.ForbiddenException('Acesso negado');
        if (event.status === 'CANCELLED' || event.status === 'FINISHED') {
            throw new common_1.ForbiddenException('Evento não permite alterações');
        }
        const startsAt = new Date(dto.startsAt);
        const endsAt = new Date(dto.endsAt);
        if (endsAt <= startsAt)
            throw new common_1.BadRequestException('Data de fim deve ser após a de início');
        if (endsAt > event.startDate) {
            throw new common_1.BadRequestException('Lote não pode terminar após o início do evento');
        }
        return this.prisma.batch.create({
            data: {
                eventId,
                name: dto.name,
                description: dto.description,
                price: dto.price,
                quantity: dto.quantity,
                startsAt,
                endsAt,
                ticketType: dto.ticketType ?? 'GENERAL',
                sortOrder: dto.sortOrder ?? 0,
            },
        });
    }
    async update(eventId, batchId, dto, producerId) {
        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event)
            throw new common_1.NotFoundException('Evento não encontrado');
        if (event.producerId !== producerId)
            throw new common_1.ForbiddenException('Acesso negado');
        const batch = await this.prisma.batch.findUnique({ where: { id: batchId } });
        if (!batch || batch.eventId !== eventId)
            throw new common_1.NotFoundException('Lote não encontrado');
        if (dto.quantity !== undefined && dto.quantity < batch.sold) {
            throw new common_1.BadRequestException(`Quantidade não pode ser menor que os ${batch.sold} ingressos já vendidos`);
        }
        const updated = await this.prisma.batch.update({
            where: { id: batchId },
            data: {
                ...(dto.quantity !== undefined && { quantity: dto.quantity }),
                ...(dto.price !== undefined && { price: dto.price }),
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.quantity !== undefined && dto.quantity > batch.sold && batch.status === 'SOLD_OUT' && { status: 'ACTIVE' }),
            },
        });
        return updated;
    }
    async findByEvent(eventId) {
        return this.prisma.batch.findMany({
            where: { eventId },
            orderBy: { sortOrder: 'asc' },
        });
    }
    async reserveStock(batchId, quantity, tx) {
        const batch = await tx.batch.findUnique({ where: { id: batchId } });
        if (!batch)
            throw new common_1.NotFoundException('Lote não encontrado');
        if (batch.status !== 'ACTIVE')
            throw new common_1.BadRequestException(`Lote "${batch.name}" indisponível`);
        const now = new Date();
        if (now < batch.startsAt || now > batch.endsAt) {
            throw new common_1.BadRequestException(`Lote "${batch.name}" fora do período de vendas`);
        }
        const available = batch.quantity - batch.sold;
        if (available < quantity) {
            throw new common_1.BadRequestException(`Ingressos insuficientes no lote "${batch.name}". Disponíveis: ${available}`);
        }
        const updated = await tx.batch.update({
            where: { id: batchId, sold: { lte: batch.quantity - quantity } },
            data: { sold: { increment: quantity } },
        });
        if (!updated)
            throw new common_1.BadRequestException('Conflito de estoque. Tente novamente.');
        if (updated.sold >= updated.quantity) {
            await tx.batch.update({ where: { id: batchId }, data: { status: 'SOLD_OUT' } });
        }
        return updated;
    }
    async releaseStock(batchId, quantity) {
        return this.prisma.batch.update({
            where: { id: batchId },
            data: {
                sold: { decrement: quantity },
                status: 'ACTIVE',
            },
        });
    }
};
exports.BatchesService = BatchesService;
exports.BatchesService = BatchesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BatchesService);
//# sourceMappingURL=batches.service.js.map