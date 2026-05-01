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
        data: ({
            event: {
                title: string;
                slug: string;
                coverImage: string | null;
                venue: string;
                startDate: Date;
            };
            batch: {
                name: string;
                ticketType: import(".prisma/client").$Enums.TicketType;
            };
            checkIn: {
                checkedAt: Date;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            token: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            eventId: string;
            holderName: string | null;
            holderEmail: string | null;
            holderCpf: string | null;
            qrCodeUrl: string | null;
            cancelledAt: Date | null;
            orderId: string;
            batchId: string;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    findOne(ticketId: string, userId: string): Promise<{
        event: {
            title: string;
            venue: string;
            address: string;
            startDate: Date;
        };
        batch: {
            name: string;
            price: import("@prisma/client/runtime/library").Decimal;
            ticketType: import(".prisma/client").$Enums.TicketType;
        };
        order: {
            userId: string;
        };
        checkIn: {
            method: import(".prisma/client").$Enums.CheckInMethod;
            checkedAt: Date;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        token: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        eventId: string;
        holderName: string | null;
        holderEmail: string | null;
        holderCpf: string | null;
        qrCodeUrl: string | null;
        cancelledAt: Date | null;
        orderId: string;
        batchId: string;
    }>;
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
