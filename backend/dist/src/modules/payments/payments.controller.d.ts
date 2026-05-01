import { Request } from 'express';
import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private payments;
    private readonly logger;
    constructor(payments: PaymentsService);
    stripeWebhook(req: Request, signature: string): Promise<{
        received: boolean;
    }>;
}
