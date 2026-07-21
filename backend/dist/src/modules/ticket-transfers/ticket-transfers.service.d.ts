import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
export declare class TicketTransfersService {
    private prismaService;
    private mail;
    private config;
    private readonly logger;
    constructor(prismaService: PrismaService, mail: MailService, config: ConfigService);
    private get prisma();
    request(ticketId: string, senderUserId: string, rawEmail: string): Promise<{
        id: any;
        status: any;
        recipientEmail: any;
        expiresAt: any;
    }>;
    inspectInvite(rawToken: string, email: string): Promise<any>;
    completeInvite(rawToken: string, userId: string, email: string): Promise<void>;
    cancel(id: string, senderUserId: string): Promise<{
        status: string;
    }>;
    expirePendingInvites(): Promise<void>;
    private expire;
    ticketStatus(ticketId: string, userId: string): Promise<any>;
    mine(userId: string): any;
    adminList(query: any): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            lastPage: number;
        };
    }>;
    adminDetail(id: string): Promise<any>;
    private sendRequestedEmails;
    private sendCompletedEmails;
}
