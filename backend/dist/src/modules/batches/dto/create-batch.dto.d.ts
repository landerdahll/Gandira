import { TicketType } from '@prisma/client';
export declare class CreateBatchDto {
    name: string;
    description?: string;
    price: number;
    quantity: number;
    startsAt: string;
    endsAt: string;
    ticketType?: TicketType;
    sortOrder?: number;
}
