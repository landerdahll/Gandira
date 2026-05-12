import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
export declare class BatchesController {
    private batches;
    constructor(batches: BatchesService);
    findAll(eventId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string;
        status: import(".prisma/client").$Enums.BatchStatus;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: number;
        sold: number;
        startsAt: Date;
        endsAt: Date;
        ticketType: import(".prisma/client").$Enums.TicketType;
        sortOrder: number;
    }[]>;
    create(eventId: string, dto: CreateBatchDto, user: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string;
        status: import(".prisma/client").$Enums.BatchStatus;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: number;
        sold: number;
        startsAt: Date;
        endsAt: Date;
        ticketType: import(".prisma/client").$Enums.TicketType;
        sortOrder: number;
    }>;
    update(eventId: string, batchId: string, dto: UpdateBatchDto, user: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string;
        status: import(".prisma/client").$Enums.BatchStatus;
        description: string | null;
        price: import("@prisma/client/runtime/library").Decimal;
        quantity: number;
        sold: number;
        startsAt: Date;
        endsAt: Date;
        ticketType: import(".prisma/client").$Enums.TicketType;
        sortOrder: number;
    }>;
}
