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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const library_1 = require("@prisma/client/runtime/library");
const prisma_service_1 = require("../../prisma/prisma.service");
const batches_service_1 = require("../batches/batches.service");
const payments_service_1 = require("../payments/payments.service");
const ORDER_EXPIRY_MINUTES = 15;
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 10);
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(prisma, batches, payments) {
        this.prisma = prisma;
        this.batches = batches;
        this.payments = payments;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async create(dto, userId) {
        const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
        if (!event || event.status !== 'PUBLISHED') {
            throw new common_1.NotFoundException('Evento não encontrado ou indisponível');
        }
        if (new Date() > event.startDate) {
            throw new common_1.BadRequestException('Evento já iniciado, vendas encerradas');
        }
        const batchIds = dto.items.map((i) => i.batchId);
        const batchMap = new Map((await this.prisma.batch.findMany({ where: { id: { in: batchIds }, eventId: dto.eventId } })).map((b) => [b.id, b]));
        if (batchMap.size !== batchIds.length) {
            throw new common_1.BadRequestException('Um ou mais lotes inválidos para este evento');
        }
        const order = await this.prisma.$transaction(async (tx) => {
            let subtotal = new library_1.Decimal(0);
            const lineItems = [];
            for (const item of dto.items) {
                const batch = await this.batches.reserveStock(item.batchId, item.quantity, tx);
                const unitPrice = new library_1.Decimal(batch.price.toString());
                const lineTotal = unitPrice.mul(item.quantity);
                subtotal = subtotal.add(lineTotal);
                lineItems.push({ batchId: item.batchId, quantity: item.quantity, unitPrice, total: lineTotal });
            }
            const platformFee = subtotal.mul(PLATFORM_FEE_PERCENT / 100).toDecimalPlaces(2);
            const total = subtotal.add(platformFee);
            const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000);
            return tx.order.create({
                data: {
                    userId,
                    eventId: dto.eventId,
                    subtotal,
                    platformFee,
                    total,
                    expiresAt,
                    items: {
                        create: lineItems,
                    },
                },
                include: { items: true, event: { select: { title: true } } },
            });
        });
        const paymentIntent = await this.payments.createPaymentIntent(order);
        await this.prisma.order.update({
            where: { id: order.id },
            data: { stripePaymentIntentId: paymentIntent.id },
        });
        return {
            orderId: order.id,
            total: order.total,
            expiresAt: order.expiresAt,
            clientSecret: paymentIntent.client_secret,
        };
    }
    async findUserOrders(userId, page = 1, limit = 20) {
        const take = Math.min(limit, 50);
        const skip = (page - 1) * take;
        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where: { userId },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    event: { select: { title: true, slug: true, startDate: true, coverImage: true } },
                    items: {
                        include: { batch: { select: { name: true, ticketType: true } } },
                    },
                    tickets: { select: { id: true, status: true } },
                },
            }),
            this.prisma.order.count({ where: { userId } }),
        ]);
        return { data, meta: { total, page, lastPage: Math.ceil(total / take) } };
    }
    async findOne(orderId, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                event: { select: { title: true, slug: true, startDate: true, venue: true, coverImage: true } },
                items: { include: { batch: true } },
                tickets: true,
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Pedido não encontrado');
        if (order.userId !== userId)
            throw new common_1.ForbiddenException('Acesso negado');
        return order;
    }
    async cancel(orderId, userId, reason) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { event: true, items: true },
        });
        if (!order)
            throw new common_1.NotFoundException('Pedido não encontrado');
        if (order.userId !== userId)
            throw new common_1.ForbiddenException('Acesso negado');
        if (order.status !== 'PAID') {
            throw new common_1.BadRequestException('Apenas pedidos pagos podem ser cancelados');
        }
        const daysSincePurchase = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSincePurchase > 7) {
            throw new common_1.BadRequestException('Prazo de cancelamento (7 dias) expirado');
        }
        const hoursUntilEvent = (order.event.startDate.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilEvent <= 48) {
            throw new common_1.BadRequestException('Cancelamento não permitido nas 48h antes do evento');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: orderId },
                data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
            });
            await tx.ticket.updateMany({
                where: { orderId },
                data: { status: 'CANCELLED', cancelledAt: new Date() },
            });
            for (const item of order.items) {
                await this.batches.releaseStock(item.batchId, item.quantity);
            }
        });
        if (order.stripePaymentIntentId) {
            await this.payments.refund(orderId, order.stripePaymentIntentId);
        }
        this.logger.log(`Order ${orderId} cancelled by user ${userId}`);
    }
    async expireStaleOrders() {
        const stale = await this.prisma.order.findMany({
            where: { status: 'PENDING', expiresAt: { lt: new Date() } },
            include: { items: true },
        });
        for (const order of stale) {
            try {
                await this.prisma.$transaction(async (tx) => {
                    await tx.order.update({ where: { id: order.id }, data: { status: 'EXPIRED' } });
                    await tx.ticket.updateMany({
                        where: { orderId: order.id },
                        data: { status: 'CANCELLED' },
                    });
                    for (const item of order.items) {
                        await this.batches.releaseStock(item.batchId, item.quantity);
                    }
                });
                this.logger.log(`Order ${order.id} expired`);
            }
            catch (e) {
                this.logger.error(`Failed to expire order ${order.id}`, e);
            }
        }
    }
};
exports.OrdersService = OrdersService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrdersService.prototype, "expireStaleOrders", null);
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        batches_service_1.BatchesService,
        payments_service_1.PaymentsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map