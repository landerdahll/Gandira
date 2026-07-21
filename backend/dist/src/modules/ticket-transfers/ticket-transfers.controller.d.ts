import { RequestTransferDto } from './dto/request-transfer.dto';
import { TicketTransfersService } from './ticket-transfers.service';
export declare class TicketTransfersController {
    private readonly service;
    constructor(service: TicketTransfersService);
    request(ticketId: string, dto: RequestTransferDto, user: any): Promise<{
        id: any;
        status: any;
        recipientEmail: any;
        expiresAt: any;
    }>;
    status(ticketId: string, user: any): Promise<any>;
    cancel(id: string, user: any): Promise<{
        status: string;
    }>;
    mine(user: any): any;
    adminList(query: any, page: number, limit: number): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            lastPage: number;
        };
    }>;
    adminDetail(id: string): Promise<any>;
}
