import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderFulfillmentService } from '../order-fulfillment/order-fulfillment.service';
export declare class PaymentsService {
    private config;
    private prisma;
    private fulfillment;
    private readonly stripe;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService, fulfillment: OrderFulfillmentService);
    createPaymentIntent(order: any): Promise<Stripe.PaymentIntent>;
    refund(orderId: string, paymentIntentId: string): Promise<Stripe.Refund>;
    confirmOrder(orderId: string, userId: string): Promise<{
        status: string;
    }>;
    constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event;
    handleWebhookEvent(event: Stripe.Event): Promise<void>;
    private onPaymentSucceeded;
    private onPaymentFailed;
}
