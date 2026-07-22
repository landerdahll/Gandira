import { Injectable, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderFulfillmentService } from '../order-fulfillment/order-fulfillment.service';
import { calculateRemainingPaymentSeconds } from '../order-fulfillment/payment-expiration.util';

const BASE_URL = 'https://api.abacatepay.com/v2';

@Injectable()
export class AbacatepayService {
  private readonly logger = new Logger(AbacatepayService.name);
  private readonly apiKey: string;
  private readonly webhookSecret: string;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private fulfillment: OrderFulfillmentService,
  ) {
    this.apiKey = config.get<string>('ABACATEPAY_API_KEY')!;
    this.webhookSecret = config.get<string>('ABACATEPAY_WEBHOOK_SECRET', '');
  }

  async createPixCharge(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { event: { select: { title: true } } },
    });

    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.userId !== userId) throw new ForbiddenException('Acesso negado');
    if (order.status !== 'PENDING') throw new BadRequestException('Pedido não está mais pendente');
    const expiresIn = calculateRemainingPaymentSeconds(order.expiresAt);

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
      throw new BadRequestException('Erro ao gerar cobrança PIX');
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

  async checkPixAndConfirm(pixId: string, orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.userId !== userId) throw new ForbiddenException('Acesso negado');
    if (order.status === 'PAID') return { status: 'PAID' };
    if (order.status !== 'PENDING') return { status: order.status };

    const res = await fetch(`${BASE_URL}/transparents/check?id=${encodeURIComponent(pixId)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!res.ok) return { status: order.status };

    const body = await res.json();
    const pixStatus: string = body.data?.status ?? '';
    this.logger.log(`AbacatePay check pixId=${pixId} status=${pixStatus}`);

    if (pixStatus === 'PAID' || pixStatus === 'APPROVED') {
      const result = await this.onPixPaid(orderId, pixId);
      return { status: result.status === 'FULFILLED' || result.status === 'ALREADY_PAID' ? 'PAID' : result.status };
    }

    return { status: pixStatus || order.status };
  }

  async simulatePixPayment(pixId: string) {
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
      throw new BadRequestException('Erro ao simular pagamento');
    }

    return { simulated: true };
  }

  async handleWebhook(payload: any, secret: string) {
    this.logger.log(`AbacatePay webhook recebido: ${JSON.stringify(payload)}`);

    if (this.webhookSecret && secret !== this.webhookSecret) {
      this.logger.warn(`AbacatePay webhook: secret inválido (recebido: ${secret})`);
      return;
    }

    const event: string = payload.event;
    this.logger.log(`AbacatePay webhook event: ${event}`);

    if (event !== 'transparent.completed') return;

    const externalId: string | undefined = payload.data?.externalId;
    this.logger.log(`AbacatePay webhook externalId: ${externalId}`);

    if (!externalId) {
      this.logger.error(`AbacatePay webhook: externalId ausente. data: ${JSON.stringify(payload.data)}`);
      return;
    }

    await this.onPixPaid(externalId, payload.data?.id);
  }

  private async onPixPaid(orderId: string, pixId?: string) {
    const result = await this.fulfillment.confirmPaidOrder({
      orderId,
      gateway: 'ABACATEPAY',
      externalPaymentId: pixId,
    });
    if (result.status === 'FULFILLED') this.logger.log(`PIX confirmado para pedido ${orderId}`);
    return result;
  }
}
