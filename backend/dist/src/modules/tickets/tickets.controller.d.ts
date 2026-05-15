import { TicketsService } from './tickets.service';
export declare class TicketsController {
    private tickets;
    constructor(tickets: TicketsService);
    findAll(user: any, page: number, limit: number): Promise<{
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
            eventId: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            cancelledAt: Date | null;
            batchId: string;
            orderId: string;
            token: string;
            holderName: string | null;
            holderEmail: string | null;
            holderCpf: string | null;
            qrCodeUrl: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    findOne(id: string, user: any): Promise<{
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
        eventId: string;
        status: import(".prisma/client").$Enums.TicketStatus;
        cancelledAt: Date | null;
        batchId: string;
        orderId: string;
        token: string;
        holderName: string | null;
        holderEmail: string | null;
        holderCpf: string | null;
        qrCodeUrl: string | null;
    }>;
}
