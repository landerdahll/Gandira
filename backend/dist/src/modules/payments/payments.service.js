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
const order_fulfillment_service_1 = require("../order-fulfillment/order-fulfillment.service");
const payment_expiration_util_1 = require("../order-fulfillment/payment-expiration.util");
const order_expiration_service_1 = require("../order-fulfillment/order-expiration.service");
const club_benefits_service_1 = require("../club-benefits/club-benefits.service");
const client_1 = require("@prisma/client");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(config, prisma, fulfillment, expiration, clubBenefits) {
        this.config = config;
        this.prisma = prisma;
        this.fulfillment = fulfillment;
        this.expiration = expiration;
        this.clubBenefits = clubBenefits;
        this.logger = new common_1.Logger(PaymentsService_1.name);
        this.stripe = new stripe_1.default(config.get('STRIPE_SECRET_KEY'), {
            apiVersion: '2023-10-16',
            typescript: true,
        });
    }
    async createPaymentIntent(order) {
        const amountCents = new client_1.Prisma.Decimal(order.total.toString())
            .mul(100)
            .toDecimalPlaces(0, client_1.Prisma.Decimal.ROUND_HALF_UP)
            .toNumber();
        const expiresAfterSeconds = (0, payment_expiration_util_1.calculateRemainingPaymentSeconds)(new Date(order.expiresAt));
        return this.stripe.paymentIntents.create({
            amount: amountCents,
            currency: 'brl',
            metadata: {
                orderId: order.id,
                eventId: order.eventId,
                eventTitle: order.event?.title ?? '',
            },
            automatic_payment_methods: { enabled: true },
            payment_method_options: {
                pix: { expires_after_seconds: expiresAfterSeconds },
            },
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
        if (refund.status === 'succeeded') {
            await this.markFullyRefunded(orderId, refund.id);
        }
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
        const result = await this.onPaymentSucceeded(pi);
        return { status: result.status === 'FULFILLED' || result.status === 'ALREADY_PAID' ? 'PAID' : result.status };
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
                await this.onChargeRefunded(event.data.object);
                break;
            default:
                this.logger.debug(`Unhandled event type: ${event.type}`);
        }
    }
    async onPaymentSucceeded(pi) {
        const order = await this.prisma.order.findUnique({
            where: { stripePaymentIntentId: pi.id },
            select: { id: true },
        });
        if (!order) {
            this.logger.error(`Order not found for PaymentIntent ${pi.id}`);
            return { status: 'ORDER_NOT_FOUND' };
        }
        const result = await this.fulfillment.confirmPaidOrder({
            orderId: order.id,
            gateway: 'STRIPE',
            externalPaymentId: pi.id,
            stripeChargeId: typeof pi.latest_charge === 'string' ? pi.latest_charge : undefined,
        });
        if (result.status === 'FULFILLED')
            this.logger.log(`Payment succeeded for order ${order.id}`);
        return result;
    }
    async onPaymentFailed(pi) {
        const order = await this.prisma.order.findUnique({ where: { stripePaymentIntentId: pi.id }, select: { id: true } });
        if (!order)
            return;
        const cancelled = await this.expiration.cancelPendingOrder(order.id, 'PAYMENT_FAILED');
        if (cancelled)
            this.logger.log(`Payment failed for order ${order.id} — stock released`);
    }
    async onChargeRefunded(charge) {
        if (charge.amount_refunded !== charge.amount || typeof charge.payment_intent !== 'string')
            return;
        const order = await this.prisma.order.findUnique({
            where: { stripePaymentIntentId: charge.payment_intent },
            select: { id: true },
        });
        if (!order)
            return;
        await this.markFullyRefunded(order.id, charge.refunds?.data[0]?.id);
    }
    async markFullyRefunded(orderId, stripeRefundId) {
        const now = new Date();
        await this.prisma.$transaction(async (tx) => {
            await tx.order.updateMany({
                where: { id: orderId, status: { in: ['PAID', 'CANCELLED'] } },
                data: { status: 'REFUNDED', refundedAt: now, ...(stripeRefundId ? { stripeRefundId } : {}) },
            });
            await this.clubBenefits.releaseConfirmedForOrderInTransaction(tx, orderId, 'FULL_REFUND_CONFIRMED', now);
        });
        this.logger.log(`Full refund confirmed for order ${orderId}`);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        order_fulfillment_service_1.OrderFulfillmentService,
        order_expiration_service_1.OrderExpirationService,
        club_benefits_service_1.ClubBenefitsService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map