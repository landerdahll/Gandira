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
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto_util_1 = require("../../common/utils/crypto.util");
const crypto_1 = require("crypto");
let EventsService = class EventsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, producerId) {
        let slug = (0, crypto_util_1.slugify)(dto.title);
        const existing = await this.prisma.event.findUnique({ where: { slug } });
        if (existing)
            slug = `${slug}-${(0, crypto_1.randomBytes)(3).toString('hex')}`;
        return this.prisma.event.create({
            data: {
                ...dto,
                slug,
                producerId,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                doorsOpen: dto.doorsOpen ? new Date(dto.doorsOpen) : undefined,
            },
        });
    }
    async findAll(query) {
        const { city, category, page = 1, limit = 20, search, past = false } = query;
        const take = Math.min(limit, 50);
        const skip = (page - 1) * take;
        const now = new Date();
        const where = {
            status: client_1.EventStatus.PUBLISHED,
            startDate: past ? { lt: now } : { gte: now },
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(category && { category }),
            ...(search && {
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { venue: { contains: search, mode: 'insensitive' } },
                    { city: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            this.prisma.event.findMany({
                where,
                skip,
                take,
                orderBy: { startDate: past ? 'desc' : 'asc' },
                select: {
                    id: true,
                    title: true,
                    slug: true,
                    coverImage: true,
                    venue: true,
                    city: true,
                    state: true,
                    startDate: true,
                    endDate: true,
                    category: true,
                    ageRating: true,
                    batches: {
                        where: { status: 'ACTIVE' },
                        orderBy: { price: 'asc' },
                        take: 1,
                        select: { price: true, name: true },
                    },
                },
            }),
            this.prisma.event.count({ where }),
        ]);
        return {
            data,
            meta: { total, page, lastPage: Math.ceil(total / take) },
        };
    }
    async findBySlug(slug) {
        const event = await this.prisma.event.findUnique({
            where: { slug },
            include: {
                producer: { select: { id: true, name: true } },
                batches: {
                    where: { status: { in: ['ACTIVE', 'SOLD_OUT'] } },
                    orderBy: { sortOrder: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        price: true,
                        quantity: true,
                        sold: true,
                        startsAt: true,
                        endsAt: true,
                        ticketType: true,
                        status: true,
                    },
                },
            },
        });
        if (!event || event.status !== client_1.EventStatus.PUBLISHED) {
            throw new common_1.NotFoundException('Evento não encontrado');
        }
        return event;
    }
    async findProducerEvents(producerId, page = 1, limit = 20) {
        const take = Math.min(limit, 50);
        const skip = (page - 1) * take;
        const [data, total] = await Promise.all([
            this.prisma.event.findMany({
                where: { producerId },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { tickets: true, orders: true } },
                    batches: { select: { price: true, sold: true } },
                },
            }),
            this.prisma.event.count({ where: { producerId } }),
        ]);
        return {
            data,
            meta: { total, page, lastPage: Math.ceil(total / take) },
        };
    }
    async findByIdForProducer(eventId, producerId) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            include: {
                batches: { orderBy: { sortOrder: 'asc' } },
            },
        });
        if (!event)
            throw new common_1.NotFoundException('Evento não encontrado');
        if (event.producerId !== producerId)
            throw new common_1.ForbiddenException('Acesso negado');
        return event;
    }
    async update(eventId, producerId, dto) {
        await this.getOwnedEvent(eventId, producerId);
        const { startDate, endDate, doorsOpen, ...rest } = dto;
        return this.prisma.event.update({
            where: { id: eventId },
            data: {
                ...rest,
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate && { endDate: new Date(endDate) }),
                ...(doorsOpen !== undefined && { doorsOpen: doorsOpen ? new Date(doorsOpen) : null }),
            },
        });
    }
    async publish(eventId, producerId) {
        const event = await this.getOwnedEvent(eventId, producerId);
        const hasBatches = await this.prisma.batch.count({ where: { eventId, status: 'ACTIVE' } });
        if (!hasBatches) {
            throw new common_1.ForbiddenException('Crie pelo menos um lote antes de publicar');
        }
        return this.prisma.event.update({
            where: { id: eventId },
            data: { status: client_1.EventStatus.PUBLISHED },
        });
    }
    async cancel(eventId, producerId) {
        const event = await this.getOwnedEvent(eventId, producerId);
        if (event.status === client_1.EventStatus.FINISHED) {
            throw new common_1.ForbiddenException('Evento já finalizado');
        }
        return this.prisma.$transaction(async (tx) => {
            await tx.event.update({ where: { id: eventId }, data: { status: client_1.EventStatus.CANCELLED } });
            await tx.batch.updateMany({ where: { eventId }, data: { status: 'CANCELLED' } });
            await tx.ticket.updateMany({
                where: { eventId, status: 'ACTIVE' },
                data: { status: 'CANCELLED', cancelledAt: new Date() },
            });
        });
    }
    async getOwnedEvent(eventId, producerId) {
        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event)
            throw new common_1.NotFoundException('Evento não encontrado');
        if (event.producerId !== producerId)
            throw new common_1.ForbiddenException('Acesso negado');
        return event;
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventsService);
//# sourceMappingURL=events.service.js.map