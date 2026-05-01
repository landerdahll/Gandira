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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const prisma_service_1 = require("../../prisma/prisma.service");
const tickets_service_1 = require("../tickets/tickets.service");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(config, prisma, tickets) {
        this.config = config;
        this.prisma = prisma;
        this.tickets = tickets;
        this.logger = new common_1.Logger(PaymentsService_1.name);
        this.stripe = new stripe_1.default(config.get('STRIPE_SECRET_KEY'), {
            apiVersion: '2023-10-16',
            typescript: true,
        });
    }
    async createPaymentIntent(order) {
        const amountCents = Math.round(Number(order.total) * 100);
        return this.stripe.paymentIntents.create({
            amount: amountCents,
            currency: 'brl',
            metadata: {
                orderId: order.id,
                eventId: order.eventId,
                eventTitle: order.event?.title ?? '',
            },
            automatic_payment_methods: { enabled: true },
        });
    }
    async refund(orderId, paymentIntentId) {
        const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        if (!pi.latest_charge) {
            throw new common_1.BadRequestException('Pagamento ainda não foi capturado, não há cobrança para reembolsar');
        }
        const refund = await this.stripe.refunds.create({
            charge: pi.latest_charge,
            reason: 'requested_by_customer',
            metadata: { orderId },
        });
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'REFUNDED',
                refundedAt: new Date(),
                stripeRefundId: refund.id,
            },
        });
        this.logger.log(`Refund created for order ${orderId}: ${refund.id}`);
        return refund;
    }
    async confirmOrder(orderId, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { batch: true } } },
        });
        if (!order)
            throw new common_1.NotFoundException('Pedido não encontrado');
        if (order.userId !== userId)
            throw new common_1.ForbiddenException('Acesso negado');
        if (order.status === 'PAID')
            return { status: 'PAID' };
        if (order.status !== 'PENDING')
            return { status: order.status };
        if (!order.stripePaymentIntentId) {
            return { status: order.status };
        }
        const pi = await this.stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
        if (pi.status !== 'succeeded')
            return { status: order.status };
        await this.onPaymentSucceeded(pi);
        return { status: 'PAID' };
    }
    constructWebhookEvent(payload, signature) {
        const secret = this.config.get('STRIPE_WEBHOOK_SECRET');
        try {
            return this.stripe.webhooks.constructEvent(payload, signature, secret);
        }
        catch (e) {
            this.logger.error('Webhook signature verification failed', e);
            throw new common_1.BadRequestException('Assinatura do webhook inválida');
        }
    }
    async handleWebhookEvent(event) {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.onPaymentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
            case 'payment_intent.canceled':
                await this.onPaymentFailed(event.data.object);
                break;
            case 'charge.refunded':
                this.logger.log(`Charge refunded: ${event.data.object.id}`);
                break;
            default:
                this.logger.debug(`Unhandled event type: ${event.type}`);
        }
    }
    async onPaymentSucceeded(pi) {
        const order = await this.prisma.order.findUnique({
            where: { stripePaymentIntentId: pi.id },
            include: { items: { include: { batch: true } } },
        });
        if (!order) {
            this.logger.error(`Order not found for PaymentIntent ${pi.id}`);
            return;
        }
        if (order.status === 'PAID') {
            this.logger.warn(`Order ${order.id} already paid — idempotent webhook`);
            return;
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: 'PAID',
                    stripeChargeId: typeof pi.latest_charge === 'string' ? pi.latest_charge : undefined,
                },
            });
            for (const item of order.items) {
                for (let i = 0; i < item.quantity; i++) {
                    await this.tickets.generateTicket({ orderId: order.id, batchId: item.batchId, eventId: order.eventId }, tx);
                }
            }
        });
        this.logger.log(`Payment succeeded for order ${order.id} — tickets generated`);
    }
    async onPaymentFailed(pi) {
        const order = await this.prisma.order.findUnique({
            where: { stripePaymentIntentId: pi.id },
            include: { items: true },
        });
        if (!order || order.status !== 'PENDING')
            return;
        await this.prisma.$transaction(async (tx) => {
            await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
            for (const item of order.items) {
                await tx.batch.update({
                    where: { id: item.batchId },
                    data: { sold: { decrement: item.quantity }, status: 'ACTIVE' },
                });
            }
        });
        this.logger.log(`Payment failed for order ${order.id} — stock released`);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        tickets_service_1.TicketsService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map