import { TicketsService } from './tickets.service';
export declare class TicketsController {
    private tickets;
    constructor(tickets: TicketsService);
    findAll(user: any, page: number, limit: number): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            lastPage: number;
        };
    }>;
    findOne(id: string, user: any): Promise<any>;
}
