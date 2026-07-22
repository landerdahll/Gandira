import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TicketsService } from '../tickets/tickets.service';
import { OrderExpirationService } from './order-expiration.service';
export type PaymentGateway = 'STRIPE' | 'ABACATEPAY';
export type OrderFulfillmentStatus = 'FULFILLED' | 'ALREADY_PAID' | 'LATE_PAYMENT_REQUIRES_REVIEW' | 'ORDER_NOT_PAYABLE' | 'ORDER_NOT_FOUND';
export interface ConfirmPaidOrderInput {
    orderId: string;
    gateway: PaymentGateway;
    externalPaymentId?: string;
    stripeChargeId?: string;
}
export interface OrderFulfillmentResult {
    status: OrderFulfillmentStatus;
    orderStatus?: string;
}
export declare class OrderFulfillmentService {
    private readonly prisma;
    private readonly tickets;
    private readonly mail;
    private readonly config;
    private readonly expiration;
    private readonly logger;
    constructor(prisma: PrismaService, tickets: TicketsService, mail: MailService, config: ConfigService, expiration: OrderExpirationService);
    confirmPaidOrder(input: ConfirmPaidOrderInput): Promise<OrderFulfillmentResult>;
    private sendConfirmationEmail;
}
