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
var OrderFulfillmentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderFulfillmentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const serializable_retry_util_1 = require("../../common/utils/serializable-retry.util");
const prisma_service_1 = require("../../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const tickets_service_1 = require("../tickets/tickets.service");
const order_expiration_service_1 = require("./order-expiration.service");
let OrderFulfillmentService = OrderFulfillmentService_1 = class OrderFulfillmentService {
    constructor(prisma, tickets, mail, config, expiration) {
        this.prisma = prisma;
        this.tickets = tickets;
        this.mail = mail;
        this.config = config;
        this.expiration = expiration;
        this.logger = new common_1.Logger(OrderFulfillmentService_1.name);
    }
    async confirmPaidOrder(input) {
        const now = new Date();
        const result = await (0, serializable_retry_util_1.withSerializableRetry)(() => this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: input.orderId },
                include: { items: true },
            });
            if (!order)
                return { status: 'ORDER_NOT_FOUND' };
            if (order.status === 'PAID')
                return { status: 'ALREADY_PAID', orderStatus: order.status };
            if (order.status === 'EXPIRED') {
                return { status: 'LATE_PAYMENT_REQUIRES_REVIEW', orderStatus: order.status };
            }
            if (order.status !== 'PENDING') {
                return { status: 'ORDER_NOT_PAYABLE', orderStatus: order.status };
            }
            if (order.expiresAt <= now) {
                await this.expiration.expirePendingOrderInTransaction(tx, order.id, now);
                return { status: 'LATE_PAYMENT_REQUIRES_REVIEW', orderStatus: 'EXPIRED' };
            }
            const claimed = await tx.order.updateMany({
                where: { id: order.id, status: 'PENDING', expiresAt: { gt: now } },
                data: {
                    status: 'PAID',
                    ...(input.gateway === 'STRIPE' && input.stripeChargeId
                        ? { stripeChargeId: input.stripeChargeId }
                        : {}),
                },
            });
            if (claimed.count !== 1) {
                const current = await tx.order.findUnique({ where: { id: order.id }, select: { status: true } });
                if (current?.status === 'PAID')
                    return { status: 'ALREADY_PAID', orderStatus: current.status };
                if (current?.status === 'EXPIRED')
                    return { status: 'LATE_PAYMENT_REQUIRES_REVIEW', orderStatus: current.status };
                return { status: 'ORDER_NOT_PAYABLE', orderStatus: current?.status };
            }
            for (const item of order.items) {
                for (let index = 0; index < item.quantity; index += 1) {
                    await this.tickets.generateTicket({ orderId: order.id, batchId: item.batchId, eventId: order.eventId }, tx);
                }
            }
            return { status: 'FULFILLED', orderStatus: 'PAID' };
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }));
        if (result.status === 'LATE_PAYMENT_REQUIRES_REVIEW') {
            this.logger.error(JSON.stringify({
                event: 'LATE_PAYMENT_REQUIRES_REVIEW',
                orderId: input.orderId,
                gateway: input.gateway,
                externalPaymentId: input.externalPaymentId ?? null,
            }));
        }
        if (result.status === 'FULFILLED') {
            await this.sendConfirmationEmail(input.orderId).catch((error) => {
                this.logger.error(`Falha ao enviar e-mail de confirmação do pedido ${input.orderId}: ${error.message}`);
            });
        }
        return result;
    }
    async sendConfirmationEmail(orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: { select: { email: true, name: true } },
                event: { select: { title: true, startDate: true, venue: true, city: true } },
                items: { include: { batch: { select: { name: true, ticketType: true } } } },
                tickets: { select: { id: true } },
            },
        });
        if (!order)
            return;
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000').split(',')[0].trim();
        await this.mail.sendOrderConfirmation(order.user.email, order.user.name, {
            eventTitle: order.event.title,
            eventDate: order.event.startDate,
            venue: `${order.event.venue}, ${order.event.city}`,
            items: order.items.map((item) => ({
                batchName: item.batch.name,
                ticketType: item.batch.ticketType,
                quantity: item.quantity,
            })),
            total: Number(order.total),
            ticketCount: order.tickets.length,
            myTicketsUrl: `${frontendUrl}/my-tickets`,
        });
    }
};
exports.OrderFulfillmentService = OrderFulfillmentService;
exports.OrderFulfillmentService = OrderFulfillmentService = OrderFulfillmentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tickets_service_1.TicketsService,
        mail_service_1.MailService,
        config_1.ConfigService,
        order_expiration_service_1.OrderExpirationService])
], OrderFulfillmentService);
//# sourceMappingURL=order-fulfillment.service.js.map