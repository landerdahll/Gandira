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
var AbacatepayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbacatepayService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const order_fulfillment_service_1 = require("../order-fulfillment/order-fulfillment.service");
const payment_expiration_util_1 = require("../order-fulfillment/payment-expiration.util");
const BASE_URL = 'https://api.abacatepay.com/v2';
let AbacatepayService = AbacatepayService_1 = class AbacatepayService {
    constructor(config, prisma, fulfillment) {
        this.config = config;
        this.prisma = prisma;
        this.fulfillment = fulfillment;
        this.logger = new common_1.Logger(AbacatepayService_1.name);
        this.apiKey = config.get('ABACATEPAY_API_KEY');
        this.webhookSecret = config.get('ABACATEPAY_WEBHOOK_SECRET', '');
    }
    async createPixCharge(orderId, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { event: { select: { title: true } } },
        });
        if (!order)
            throw new common_1.NotFoundException('Pedido não encontrado');
        if (order.userId !== userId)
            throw new common_1.ForbiddenException('Acesso negado');
        if (order.status !== 'PENDING')
            throw new common_1.BadRequestException('Pedido não está mais pendente');
        const expiresIn = (0, payment_expiration_util_1.calculateRemainingPaymentSeconds)(order.expiresAt);
        const amountCents = Math.round(Number(order.total) * 100);
        const res = await fetch(`${BASE_URL}/transparents/create`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                method: 'PIX',
                data: {
                    amount: amountCents,
                    externalId: orderId,
                    description: `Ingressos - ${order.event.title}`,
                    expiresIn,
                },
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            this.logger.error(`AbacatePay create error: ${err}`);
            throw new common_1.BadRequestException('Erro ao gerar cobrança PIX');
        }
        const body = await res.json();
        this.logger.log(`AbacatePay create response: ${JSON.stringify(body)}`);
        const data = body.data;
        return {
            id: data.id,
            brCode: data.brCode,
            brCodeBase64: data.brCodeBase64,
            expiresAt: order.expiresAt,
        };
    }
    async checkPixAndConfirm(pixId, orderId, userId) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order)
            throw new common_1.NotFoundException('Pedido não encontrado');
        if (order.userId !== userId)
            throw new common_1.ForbiddenException('Acesso negado');
        if (order.status === 'PAID')
            return { status: 'PAID' };
        if (order.status !== 'PENDING')
            return { status: order.status };
        const res = await fetch(`${BASE_URL}/transparents/check?id=${encodeURIComponent(pixId)}`, {
            headers: { Authorization: `Bearer ${this.apiKey}` },
        });
        if (!res.ok)
            return { status: order.status };
        const body = await res.json();
        const pixStatus = body.data?.status ?? '';
        this.logger.log(`AbacatePay check pixId=${pixId} status=${pixStatus}`);
        if (pixStatus === 'PAID' || pixStatus === 'APPROVED') {
            const result = await this.onPixPaid(orderId, pixId);
            return { status: result.status === 'FULFILLED' || result.status === 'ALREADY_PAID' ? 'PAID' : result.status };
        }
        return { status: pixStatus || order.status };
    }
    async simulatePixPayment(pixId) {
        const res = await fetch(`${BASE_URL}/transparents/simulate-payment?id=${encodeURIComponent(pixId)}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        });
        if (!res.ok) {
            const err = await res.text();
            this.logger.error(`AbacatePay simulate error: ${err}`);
            throw new common_1.BadRequestException('Erro ao simular pagamento');
        }
        return { simulated: true };
    }
    async handleWebhook(payload, secret) {
        this.logger.log(`AbacatePay webhook recebido: ${JSON.stringify(payload)}`);
        if (this.webhookSecret && secret !== this.webhookSecret) {
            this.logger.warn(`AbacatePay webhook: secret inválido (recebido: ${secret})`);
            return;
        }
        const event = payload.event;
        this.logger.log(`AbacatePay webhook event: ${event}`);
        if (event !== 'transparent.completed')
            return;
        const externalId = payload.data?.externalId;
        this.logger.log(`AbacatePay webhook externalId: ${externalId}`);
        if (!externalId) {
            this.logger.error(`AbacatePay webhook: externalId ausente. data: ${JSON.stringify(payload.data)}`);
            return;
        }
        await this.onPixPaid(externalId, payload.data?.id);
    }
    async onPixPaid(orderId, pixId) {
        const result = await this.fulfillment.confirmPaidOrder({
            orderId,
            gateway: 'ABACATEPAY',
            externalPaymentId: pixId,
        });
        if (result.status === 'FULFILLED')
            this.logger.log(`PIX confirmado para pedido ${orderId}`);
        return result;
    }
};
exports.AbacatepayService = AbacatepayService;
exports.AbacatepayService = AbacatepayService = AbacatepayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        order_fulfillment_service_1.OrderFulfillmentService])
], AbacatepayService);
//# sourceMappingURL=abacatepay.service.js.map