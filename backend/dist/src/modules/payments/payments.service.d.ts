import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { MailService } from '../mail/mail.service';
export declare class PaymentsService {
    private config;
    private prisma;
    private tickets;
    private mail;
    private readonly stripe;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService, tickets: TicketsService, mail: MailService);
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
