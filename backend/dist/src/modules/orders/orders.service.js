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
const coupons_service_1 = require("../coupons/coupons.service");
const order_expiration_service_1 = require("../order-fulfillment/order-expiration.service");
const client_1 = require("@prisma/client");
const serializable_retry_util_1 = require("../../common/utils/serializable-retry.util");
const club_benefits_service_1 = require("../club-benefits/club-benefits.service");
const ORDER_EXPIRY_MINUTES = 60;
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 10);
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(prisma, batches, payments, coupons, orderExpiration, clubBenefits) {
        this.prisma = prisma;
        this.batches = batches;
        this.payments = payments;
        this.coupons = coupons;
        this.orderExpiration = orderExpiration;
        this.clubBenefits = clubBenefits;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async create(dto, userId) {
        const buyer = await this.prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } });
        if (!buyer?.isVerified) {
            throw new common_1.ForbiddenException('Verifique seu e-mail antes de comprar ingressos');
        }
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
        let couponId;
        let discountPct = 0;
        const totalQty = dto.items.reduce((sum, item) => sum + item.quantity, 0);
        if (dto.couponCode) {
            const coupon = await this.coupons.validate(dto.eventId, dto.couponCode);
            if (coupon.maxUses !== null && coupon.usedCount + totalQty > coupon.maxUses) {
                throw new common_1.BadRequestException(`Cupom não tem ingressos suficientes disponíveis (restam ${coupon.maxUses - coupon.usedCount})`);
            }
            couponId = coupon.id;
            discountPct = coupon.discount;
        }
        let result;
        try {
            result = await (0, serializable_retry_util_1.withSerializableRetry)(() => this.prisma.$transaction(async (tx) => {
                const now = new Date();
                let subtotal = new library_1.Decimal(0);
                const lineItems = [];
                for (const item of dto.items) {
                    const batch = await this.batches.reserveStock(item.batchId, item.quantity, tx);
                    const unitPrice = new library_1.Decimal(batch.price.toString());
                    const lineTotal = unitPrice.mul(item.quantity);
                    subtotal = subtotal.add(lineTotal);
                    lineItems.push({ batchId: item.batchId, batchName: batch.name, sortOrder: batch.sortOrder, quantity: item.quantity, unitPrice, total: lineTotal });
                }
                const clubDecision = await this.clubBenefits.evaluateInTransaction(tx, {
                    userId,
                    eventId: dto.eventId,
                    items: lineItems,
                    hasCoupon: Boolean(couponId),
                    now,
                });
                const platformFee = subtotal
                    .mul(new library_1.Decimal(PLATFORM_FEE_PERCENT).div(100))
                    .toDecimalPlaces(2, library_1.Decimal.ROUND_HALF_UP);
                const couponDiscount = discountPct > 0
                    ? subtotal.mul(new library_1.Decimal(discountPct).div(100)).toDecimalPlaces(2, library_1.Decimal.ROUND_HALF_UP)
                    : new library_1.Decimal(0);
                const discountAmount = clubDecision.applied
                    ? clubDecision.discountAmount
                    : couponDiscount;
                const total = subtotal.add(platformFee).sub(discountAmount);
                const expiresAt = new Date(now.getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000);
                const order = await tx.order.create({
                    data: {
                        userId,
                        eventId: dto.eventId,
                        subtotal,
                        platformFee,
                        discountAmount,
                        clubBenefitReason: clubDecision.reason,
                        total,
                        couponId,
                        expiresAt,
                        items: { create: lineItems.map(({ batchName: _batchName, sortOrder: _sortOrder, ...item }) => item) },
                    },
                    include: { items: true, event: { select: { title: true } } },
                });
                await this.clubBenefits.createReservationInTransaction(tx, clubDecision, {
                    eventId: dto.eventId,
                    orderId: order.id,
                    expiresAt,
                    now,
                });
                const discountType = clubDecision.applied ? 'CLUB' : couponId ? 'COUPON' : 'NONE';
                return { order, clubDecision, discountType };
            }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }));
        }
        catch (error) {
            const target = error instanceof client_1.Prisma.PrismaClientKnownRequestError
                ? String(error.meta?.target ?? '')
                : '';
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError
                && error.code === 'P2002'
                && target.includes('clubMemberId')
                && target.includes('eventId')) {
                throw new common_1.ConflictException({
                    message: 'Já existe uma reserva válida do benefício para este evento',
                    code: 'CLUB_BENEFIT_RESERVED',
                    clubBenefit: { applied: false, reason: 'RESERVED_BY_OTHER_REQUEST' },
                });
            }
            throw error;
        }
        const { order, clubDecision, discountType } = result;
        if (couponId) {
            await this.prisma.coupon.update({
                where: { id: couponId },
                data: { usedCount: { increment: totalQty } },
            });
        }
        let paymentIntent;
        try {
            paymentIntent = await this.payments.createPaymentIntent(order);
        }
        catch (error) {
            await this.orderExpiration.cancelPendingOrder(order.id, 'PAYMENT_CREATION_FAILED');
            throw error;
        }
        await this.prisma.order.update({
            where: { id: order.id },
            data: { stripePaymentIntentId: paymentIntent.id },
        });
        return {
            orderId: order.id,
            total: order.total,
            expiresAt: order.expiresAt,
            clientSecret: paymentIntent.client_secret,
            discountType,
            clubBenefit: this.clubBenefits.toResponse(clubDecision),
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
                    reservedClubBenefits: { include: { batch: { select: { id: true, name: true } } } },
                    confirmedClubBenefits: { include: { batch: { select: { id: true, name: true } } } },
                },
            }),
            this.prisma.order.count({ where: { userId } }),
        ]);
        return { data: data.map((order) => this.withBenefitResponse(order)), meta: { total, page, lastPage: Math.ceil(total / take) } };
    }
    async findOne(orderId, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                event: { select: { title: true, slug: true, startDate: true, venue: true, coverImage: true } },
                items: { include: { batch: true } },
                tickets: true,
                reservedClubBenefits: { include: { batch: { select: { id: true, name: true } } } },
                confirmedClubBenefits: { include: { batch: { select: { id: true, name: true } } } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Pedido não encontrado');
        if (order.userId !== userId)
            throw new common_1.ForbiddenException('Acesso negado');
        return this.withBenefitResponse(order);
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
            select: { id: true },
        });
        for (const order of stale) {
            try {
                const result = await this.orderExpiration.expirePendingOrder(order.id);
                if (result === 'EXPIRED')
                    this.logger.log(`Order ${order.id} expired`);
            }
            catch (e) {
                this.logger.error(`Failed to expire order ${order.id}`, e);
            }
        }
    }
    withBenefitResponse(order) {
        const usage = order.confirmedClubBenefits?.[0] ?? order.reservedClubBenefits?.[0] ?? null;
        const clubBenefit = usage ? {
            applied: true,
            reason: 'AVAILABLE',
            status: usage.status,
            discountPercentage: usage.discountPercentage.toFixed(2),
            batchId: usage.batchId,
            batchName: usage.batch?.name ?? null,
            originalAmount: usage.originalAmount?.toFixed(2) ?? null,
            discountAmount: usage.discountAmount?.toFixed(2) ?? null,
            finalAmount: usage.finalAmount?.toFixed(2) ?? null,
            quantityDiscounted: 1,
            ticketId: usage.ticketId ?? null,
        } : { applied: false, reason: order.clubBenefitReason ?? 'NOT_MEMBER' };
        const { reservedClubBenefits: _reserved, confirmedClubBenefits: _confirmed, ...safeOrder } = order;
        return {
            ...safeOrder,
            discountType: usage ? 'CLUB' : order.couponId ? 'COUPON' : 'NONE',
            clubBenefit,
        };
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
        payments_service_1.PaymentsService,
        coupons_service_1.CouponsService,
        order_expiration_service_1.OrderExpirationService,
        club_benefits_service_1.ClubBenefitsService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map