import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
export declare class PaymentsService {
    private config;
    private prisma;
    private tickets;
    private readonly stripe;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService, tickets: TicketsService);
    createPaymentIntent(order: any): Promise<Stripe.PaymentIntent>;
    refund(orderId: string, paymentIntentId: string): Promise<Stripe.Refund>;
    constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event;
    handleWebhookEvent(event: Stripe.Event): Promise<void>;
    private onPaymentSucceeded;
    private onPaymentFailed;
}
