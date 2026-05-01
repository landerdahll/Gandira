import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
    private tickets: TicketsService,
  ) {
    this.stripe = new Stripe(config.get<string>('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  async createPaymentIntent(order: any): Promise<Stripe.PaymentIntent> {
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
      include: { items: { include: { batch: true } } },
    });

    if (!order) {
      this.logger.error(`Order not found for PaymentIntent ${pi.id}`);
      return;
    }

    if (order.status === 'PAID') {
      this.logger.warn(`Order ${order.id} already paid — idempotent webhook`);
      return; // Idempotent: webhook may fire more than once
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          stripeChargeId: typeof pi.latest_charge === 'string' ? pi.latest_charge : undefined,
        },
      });

      // Generate one ticket per purchased ingresso
      for (const item of order.items) {
        for (let i = 0; i < item.quantity; i++) {
          await this.tickets.generateTicket(
            { orderId: order.id, batchId: item.batchId, eventId: order.eventId },
            tx,
          );
        }
      }
    });

    this.logger.log(`Payment succeeded for order ${order.id} — tickets generated`);
  }

  private async onPaymentFailed(pi: Stripe.PaymentIntent) {
    const order = await this.prisma.order.findUnique({
      where: { stripePaymentIntentId: pi.id },
      include: { items: true },
    });

    if (!order || order.status !== 'PENDING') return;

    // Release stock on payment failure
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
}
