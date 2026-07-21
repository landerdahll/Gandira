import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private config;
    private readonly logger;
    private resend;
    private fromAddress;
    private devMode;
    constructor(config: ConfigService);
    sendTicketTransferEmail(to: string, subject: string, message: string, actionUrl?: string): Promise<void>;
    sendVerificationEmail(to: string, name: string, verifyUrl: string): Promise<void>;
    sendOrderConfirmation(to: string, name: string, data: {
        eventTitle: string;
        eventDate: Date;
        venue: string;
        items: {
            batchName: string;
            ticketType: string;
            quantity: number;
        }[];
        total: number;
        ticketCount: number;
        myTicketsUrl: string;
    }): Promise<void>;
    sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void>;
}
