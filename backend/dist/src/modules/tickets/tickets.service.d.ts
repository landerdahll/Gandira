import { PrismaService } from '../../prisma/prisma.service';
interface GenerateTicketInput {
    orderId: string;
    batchId: string;
    eventId: string;
}
export declare class TicketsService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateTicket(input: GenerateTicketInput, tx?: any): Promise<any>;
    findUserTickets(userId: string, page?: number, limit?: number): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            lastPage: number;
        };
    }>;
    findOne(ticketId: string, userId: string): Promise<any>;
    validateAndCheckIn(token: string, eventId: string, staffId: string): Promise<{
        valid: boolean;
        reason: string;
        holder: null;
    } | {
        valid: boolean;
        reason: string;
        holder: {
            name: string;
            email: string;
            batch: string;
        };
    }>;
}
export {};
