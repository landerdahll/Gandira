import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export type OrderExpirationResult = 'EXPIRED' | 'ALREADY_EXPIRED' | 'NOT_PENDING';
export declare class OrderExpirationService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    expirePendingOrder(orderId: string, now?: Date): Promise<OrderExpirationResult>;
    expirePendingOrderInTransaction(tx: Prisma.TransactionClient, orderId: string, now?: Date): Promise<OrderExpirationResult>;
}
