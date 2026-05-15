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
const tickets_service_1 = require("../tickets/tickets.service");
const mail_service_1 = require("../mail/mail.service");
const BASE_URL = 'https://api.abacatepay.com/v2';
let AbacatepayService = AbacatepayService_1 = class AbacatepayService {
    constructor(config, prisma, tickets, mail) {
        this.config = config;
        this.prisma = prisma;
        this.tickets = tickets;
        this.mail = mail;
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
                    expiresIn: 3600,
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
            expiresAt: data.expiresAt,
        };
    }
    async simulatePixPayment(pixId) {
        const res = await fetch(`${BASE_URL}/transparents/simulate-payment`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: pixId }),
        });
        if (!res.ok) {
            const err = await res.text();
            this.logger.error(`AbacatePay simulate error: ${err}`);
            throw new common_1.BadRequestException('Erro ao simular pagamento');
        }
        return { simulated: true };
    }
    async handleWebhook(payload, secret) {
        if (this.webhookSecret && secret !== this.webhookSecret) {
            this.logger.warn('AbacatePay webhook: secret inválido');
            return;
        }
        const event = payload.event;
        this.logger.log(`AbacatePay webhook: ${event}`);
        if (event !== 'transparent.completed')
            return;
        const externalId = payload.data?.externalId;
        if (!externalId) {
            this.logger.error('AbacatePay webhook: externalId ausente');
            return;
        }
        await this.onPixPaid(externalId);
    }
    async onPixPaid(orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { batch: true } } },
        });
        if (!order) {
            this.logger.error(`AbacatePay: pedido ${orderId} não encontrado`);
            return;
        }
        if (order.status === 'PAID') {
            this.logger.warn(`AbacatePay: pedido ${orderId} já pago — idempotente`);
            return;
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: orderId },
                data: { status: 'PAID' },
            });
            for (const item of order.items) {
                for (let i = 0; i < item.quantity; i++) {
                    await this.tickets.generateTicket({ orderId: order.id, batchId: item.batchId, eventId: order.eventId }, tx);
                }
            }
        });
        this.logger.log(`PIX confirmado para pedido ${orderId} — ingressos gerados`);
        this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: { select: { email: true, name: true } },
                event: { select: { title: true, startDate: true, venue: true, city: true } },
                items: { include: { batch: { select: { name: true, ticketType: true } } } },
                tickets: { select: { id: true } },
            },
        }).then(full => {
            if (!full)
                return;
            const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000').split(',')[0].trim();
            this.mail.sendOrderConfirmation(full.user.email, full.user.name, {
                eventTitle: full.event.title,
                eventDate: full.event.startDate,
                venue: `${full.event.venue}, ${full.event.city}`,
                items: full.items.map(i => ({ batchName: i.batch.name, ticketType: i.batch.ticketType, quantity: i.quantity })),
                total: Number(full.total),
                ticketCount: full.tickets.length,
                myTicketsUrl: `${frontendUrl}/my-tickets`,
            }).catch(err => this.logger.error(`E-mail falhou: ${err.message}`));
        }).catch(err => this.logger.error(`Busca de pedido falhou: ${err.message}`));
    }
};
exports.AbacatepayService = AbacatepayService;
exports.AbacatepayService = AbacatepayService = AbacatepayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        tickets_service_1.TicketsService,
        mail_service_1.MailService])
], AbacatepayService);
//# sourceMappingURL=abacatepay.service.js.map