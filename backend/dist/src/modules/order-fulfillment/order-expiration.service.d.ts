import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClubBenefitsService } from '../club-benefits/club-benefits.service';
export type OrderExpirationResult = 'EXPIRED' | 'ALREADY_EXPIRED' | 'NOT_PENDING';
export declare class OrderExpirationService {
    private readonly prisma;
    private readonly clubBenefits;
    constructor(prisma: PrismaService, clubBenefits: ClubBenefitsService);
    expirePendingOrder(orderId: string, now?: Date): Promise<OrderExpirationResult>;
    expirePendingOrderInTransaction(tx: Prisma.TransactionClient, orderId: string, now?: Date): Promise<OrderExpirationResult>;
    cancelPendingOrder(orderId: string, reason: string, now?: Date): Promise<boolean>;
}
