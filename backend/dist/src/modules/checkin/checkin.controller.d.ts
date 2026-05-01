import { TicketsService } from '../tickets/tickets.service';
declare class ScanDto {
    token: string;
}
export declare class CheckInController {
    private tickets;
    constructor(tickets: TicketsService);
    scan(eventId: string, dto: ScanDto, user: any): Promise<{
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
