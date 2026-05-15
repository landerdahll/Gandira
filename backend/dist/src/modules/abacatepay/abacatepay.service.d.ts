import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { MailService } from '../mail/mail.service';
export declare class AbacatepayService {
    private config;
    private prisma;
    private tickets;
    private mail;
    private readonly logger;
    private readonly apiKey;
    private readonly webhookSecret;
    constructor(config: ConfigService, prisma: PrismaService, tickets: TicketsService, mail: MailService);
    createPixCharge(orderId: string, userId: string): Promise<{
        id: any;
        brCode: any;
        brCodeBase64: any;
        expiresAt: any;
    }>;
    simulatePixPayment(pixId: string): Promise<{
        simulated: boolean;
    }>;
    handleWebhook(payload: any, secret: string): Promise<void>;
    private onPixPaid;
}
