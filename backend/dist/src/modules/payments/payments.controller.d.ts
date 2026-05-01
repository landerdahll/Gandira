import { Request } from 'express';
import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private payments;
    private readonly logger;
    constructor(payments: PaymentsService);
    confirmOrder(orderId: string, user: any): Promise<{
        status: string;
    }>;
    stripeWebhook(req: Request, signature: string): Promise<{
        received: boolean;
    }>;
}
