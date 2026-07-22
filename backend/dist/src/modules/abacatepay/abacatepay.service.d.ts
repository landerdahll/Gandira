import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderFulfillmentService } from '../order-fulfillment/order-fulfillment.service';
export declare class AbacatepayService {
    private config;
    private prisma;
    private fulfillment;
    private readonly logger;
    private readonly apiKey;
    private readonly webhookSecret;
    constructor(config: ConfigService, prisma: PrismaService, fulfillment: OrderFulfillmentService);
    createPixCharge(orderId: string, userId: string): Promise<{
        id: any;
        brCode: any;
        brCodeBase64: any;
        expiresAt: Date;
    }>;
    checkPixAndConfirm(pixId: string, orderId: string, userId: string): Promise<{
        status: string;
    }>;
    simulatePixPayment(pixId: string): Promise<{
        simulated: boolean;
    }>;
    handleWebhook(payload: any, secret: string): Promise<void>;
    private onPixPaid;
}
