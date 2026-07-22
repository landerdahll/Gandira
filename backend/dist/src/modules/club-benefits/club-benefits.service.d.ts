import { Prisma } from '@prisma/client';
export type ClubBenefitReason = 'AVAILABLE' | 'NOT_MEMBER' | 'INACTIVE_MEMBER' | 'ALREADY_USED' | 'RESERVED_BY_OTHER_REQUEST' | 'NO_PAID_TICKETS';
export type DiscountType = 'NONE' | 'COUPON' | 'CLUB';
export interface ClubEligibleItem {
    batchId: string;
    batchName: string;
    sortOrder: number;
    unitPrice: Prisma.Decimal;
    quantity: number;
}
export interface ClubBenefitDecision {
    applied: boolean;
    reason: ClubBenefitReason;
    clubMemberId?: string;
    discountPercentage?: Prisma.Decimal;
    batchId?: string;
    batchName?: string;
    originalAmount?: Prisma.Decimal;
    discountAmount?: Prisma.Decimal;
    finalAmount?: Prisma.Decimal;
}
export declare class ClubBenefitsService {
    evaluateInTransaction(tx: Prisma.TransactionClient, input: {
        userId: string;
        eventId: string;
        items: ClubEligibleItem[];
        hasCoupon: boolean;
        now: Date;
    }): Promise<ClubBenefitDecision>;
    createReservationInTransaction(tx: Prisma.TransactionClient, decision: ClubBenefitDecision, input: {
        eventId: string;
        orderId: string;
        expiresAt: Date;
        now: Date;
    }): Prisma.Prisma__ClubBenefitUsageClient<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ClubBenefitUsageStatus;
        ticketId: string | null;
        eventId: string;
        batchId: string | null;
        clubMemberId: string;
        activeMarker: boolean | null;
        discountPercentage: Prisma.Decimal;
        reservedOrderId: string | null;
        confirmedOrderId: string | null;
        originalAmount: Prisma.Decimal | null;
        discountAmount: Prisma.Decimal | null;
        finalAmount: Prisma.Decimal | null;
        reservedAt: Date | null;
        reservationExpiresAt: Date | null;
        confirmedAt: Date | null;
        releasedAt: Date | null;
        releaseReason: string | null;
    }, never, import("@prisma/client/runtime/library").DefaultArgs> | null;
    confirmInTransaction(tx: Prisma.TransactionClient, usageId: string, orderId: string, ticketId: string, now: Date): Promise<void>;
    releaseForOrderInTransaction(tx: Prisma.TransactionClient, orderId: string, reason: string, now?: Date): Prisma.PrismaPromise<Prisma.BatchPayload>;
    releaseConfirmedForOrderInTransaction(tx: Prisma.TransactionClient, orderId: string, reason: string, now?: Date): Prisma.PrismaPromise<Prisma.BatchPayload>;
    toResponse(decision: ClubBenefitDecision): {
        applied: boolean;
        reason: ClubBenefitReason;
        discountPercentage: string | null;
        batchId: string | null;
        batchName: string | null;
        originalAmount: string | null;
        discountAmount: string | null;
        finalAmount: string | null;
        quantityDiscounted: number;
    };
}
