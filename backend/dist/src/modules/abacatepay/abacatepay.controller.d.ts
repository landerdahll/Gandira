import { AbacatepayService } from './abacatepay.service';
export declare class AbacatepayController {
    private abacatepay;
    constructor(abacatepay: AbacatepayService);
    createPix(orderId: string, user: any): Promise<{
        id: any;
        brCode: any;
        brCodeBase64: any;
        expiresAt: any;
    }>;
    abacatepayWebhook(body: any, secret: string): Promise<{
        received: boolean;
    }>;
}
