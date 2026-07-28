import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { RefundProvider, RefundRequest, RefundResult } from './refund-provider';

@Injectable()
export class StripeRefundProvider implements RefundProvider {
  readonly gateway = 'STRIPE' as const;
  private readonly stripe: Stripe;

  constructor(config: ConfigService) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'), { apiVersion: '2023-10-16' });
  }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const result = await this.stripe.refunds.create({
      payment_intent: request.paymentId,
      amount: request.amountCents,
      reason: 'requested_by_customer',
      metadata: { orderId: request.orderId },
    }, { idempotencyKey: `order-refund-${request.orderId}` });
    return { refundId: result.id, status: result.status === 'succeeded' ? 'succeeded' : 'pending' };
  }
}
