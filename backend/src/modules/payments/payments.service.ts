import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderFulfillmentService } from '../order-fulfillment/order-fulfillment.service';
import { calculateRemainingPaymentSeconds } from '../order-fulfillment/payment-expiration.util';
import { Prisma } from '@prisma/client';
import { withSerializableRetry } from '../../common/utils/serializable-retry.util';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private fulfillment: OrderFulfillmentService,
  ) {
    this.stripe = new Stripe(config.get<string>('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  async createPaymentIntent(order: any): Promise<Stripe.PaymentIntent> {
    const amountCents = Math.round(Number(order.total) * 100);
    const expiresAfterSeconds = calculateRemainingPaymentSeconds(new Date(order.expiresAt));

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

  async refund(orderId: string, paymentIntentId: string): Promise<Stripe.Refund> {
    const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (!pi.latest_charge) {
      throw new BadRequestException('Pagamento ainda não foi capturado, não há cobrança para reembolsar');
    }

    const refund = await this.stripe.refunds.create({
      charge: pi.latest_charge as string,
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

  /**
   * Fallback para quando o webhook não chega: busca o status do PaymentIntent
   * diretamente na Stripe e processa o pagamento se confirmado.
   * Apenas o dono do pedido pode chamar isso.
   */
  async confirmOrder(orderId: string, userId: string): Promise<{ status: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { batch: true } } },
    });

    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.userId !== userId) throw new ForbiddenException('Acesso negado');

    if (order.status === 'PAID') return { status: 'PAID' };
    if (order.status !== 'PENDING') return { status: order.status };

    if (!order.stripePaymentIntentId) {
      return { status: order.status };
    }

    const pi = await this.stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (pi.status !== 'succeeded') return { status: order.status };

    const result = await this.onPaymentSucceeded(pi);
    return { status: result.status === 'FULFILLED' || result.status === 'ALREADY_PAID' ? 'PAID' : result.status };
  }

  /**
   * Verifica assinatura do webhook Stripe — CRÍTICO.
   * Sem isso, qualquer pessoa poderia forjar um evento de pagamento confirmado.
   */
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')!;
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (e) {
      this.logger.error('Webhook signature verification failed', e);
      throw new BadRequestException('Assinatura do webhook inválida');
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.onPaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        await this.onPaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        this.logger.log(`Charge refunded: ${(event.data.object as Stripe.Charge).id}`);
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  // ── Private handlers ──────────────────────────────────────────────────────

  private async onPaymentSucceeded(pi: Stripe.PaymentIntent) {
    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: pi.id },
      select: { id: true },
    });

    if (!order) {
      this.logger.error(`Order not found for PaymentIntent ${pi.id}`);
      return { status: 'ORDER_NOT_FOUND' as const };
    }

    const result = await this.fulfillment.confirmPaidOrder({
      orderId: order.id,
      gateway: 'STRIPE',
      externalPaymentId: pi.id,
      stripeChargeId: typeof pi.latest_charge === 'string' ? pi.latest_charge : undefined,
    });
    if (result.status === 'FULFILLED') this.logger.log(`Payment succeeded for order ${order.id}`);
    return result;
  }

  private async onPaymentFailed(pi: Stripe.PaymentIntent) {
    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: pi.id },
      include: { items: true },
    });

    if (!order || order.status !== 'PENDING') return;

    // Claim PENDING -> CANCELLED before releasing stock, so repeated or concurrent
    // failure events cannot cancel a paid order or release the same stock twice.
    const cancelled = await withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (claimed.count !== 1) return false;
      for (const item of order.items) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: { sold: { decrement: item.quantity }, status: 'ACTIVE' },
        });
      }
      return true;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

    if (cancelled) this.logger.log(`Payment failed for order ${order.id} — stock released`);
  }
}
