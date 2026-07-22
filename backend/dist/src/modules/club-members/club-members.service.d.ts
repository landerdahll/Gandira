import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClubMemberDto } from './dto/create-club-member.dto';
export declare class ClubMembersService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    list(page?: number, limit?: number, search?: string): Promise<{
        data: ({
            id: string;
            email: string;
            name: string | null;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            discountPercentage: Prisma.Decimal;
            activatedAt: Date;
            deactivatedAt: Date | null;
        } & {
            hasLinkedAccount: boolean;
            linkedAccount: {
                id: string;
                name: string;
                email: string;
                isActive: boolean;
            } | null;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
        summary: {
            active: number;
            inactive: number;
            total: number;
        };
    }>;
    findOne(id: string): Promise<{
        usages: ({
            event: {
                id: string;
                title: string;
            };
            batch: {
                id: string;
                name: string;
            } | null;
            reservedOrder: {
                id: string;
                status: import(".prisma/client").$Enums.OrderStatus;
            } | null;
            confirmedOrder: {
                id: string;
                status: import(".prisma/client").$Enums.OrderStatus;
            } | null;
        } & {
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
        })[];
    } & {
        id: string;
        email: string;
        name: string | null;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        discountPercentage: Prisma.Decimal;
        activatedAt: Date;
        deactivatedAt: Date | null;
    } & {
        hasLinkedAccount: boolean;
        linkedAccount: {
            id: string;
            name: string;
            email: string;
            isActive: boolean;
        } | null;
    }>;
    create(dto: CreateClubMemberDto, adminUserId: string): Promise<{
        usages: ({
            event: {
                id: string;
                title: string;
            };
            batch: {
                id: string;
                name: string;
            } | null;
            reservedOrder: {
                id: string;
                status: import(".prisma/client").$Enums.OrderStatus;
            } | null;
            confirmedOrder: {
                id: string;
                status: import(".prisma/client").$Enums.OrderStatus;
            } | null;
        } & {
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
        })[];
    } & {
        id: string;
        email: string;
        name: string | null;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        discountPercentage: Prisma.Decimal;
        activatedAt: Date;
        deactivatedAt: Date | null;
    } & {
        hasLinkedAccount: boolean;
        linkedAccount: {
            id: string;
            name: string;
            email: string;
            isActive: boolean;
        } | null;
    }>;
    activate(id: string, adminUserId: string): Promise<{
        usages: ({
            event: {
                id: string;
                title: string;
            };
            batch: {
                id: string;
                name: string;
            } | null;
            reservedOrder: {
                id: string;
                status: import(".prisma/client").$Enums.OrderStatus;
            } | null;
            confirmedOrder: {
                id: string;
                status: import(".prisma/client").$Enums.OrderStatus;
            } | null;
        } & {
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
        })[];
    } & {
        id: string;
        email: string;
        name: string | null;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        discountPercentage: Prisma.Decimal;
        activatedAt: Date;
        deactivatedAt: Date | null;
    } & {
        hasLinkedAccount: boolean;
        linkedAccount: {
            id: string;
            name: string;
            email: string;
            isActive: boolean;
        } | null;
    }>;
    deactivate(id: string, adminUserId: string): Promise<{
        usages: ({
            event: {
                id: string;
                title: string;
            };
            batch: {
                id: string;
                name: string;
            } | null;
            reservedOrder: {
                id: string;
                status: import(".prisma/client").$Enums.OrderStatus;
            } | null;
            confirmedOrder: {
                id: string;
                status: import(".prisma/client").$Enums.OrderStatus;
            } | null;
        } & {
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
        })[];
    } & {
        id: string;
        email: string;
        name: string | null;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        discountPercentage: Prisma.Decimal;
        activatedAt: Date;
        deactivatedAt: Date | null;
    } & {
        hasLinkedAccount: boolean;
        linkedAccount: {
            id: string;
            name: string;
            email: string;
            isActive: boolean;
        } | null;
    }>;
    updateDiscount(id: string, value: string, adminUserId: string): Promise<{
        usages: ({
            event: {
                id: string;
                title: string;
            };
            batch: {
                id: string;
                name: string;
            } | null;
            reservedOrder: {
                id: string;
                status: import(".prisma/client").$Enums.OrderStatus;
            } | null;
            confirmedOrder: {
                id: string;
                status: import(".prisma/client").$Enums.OrderStatus;
            } | null;
        } & {
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
        })[];
    } & {
        id: string;
        email: string;
        name: string | null;
        phone: string | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        discountPercentage: Prisma.Decimal;
        activatedAt: Date;
        deactivatedAt: Date | null;
    } & {
        hasLinkedAccount: boolean;
        linkedAccount: {
            id: string;
            name: string;
            email: string;
            isActive: boolean;
        } | null;
    }>;
    private changeStatus;
    private findLinkedAccounts;
    private withLinkedAccount;
    private optionalText;
    private normalizeEmail;
    private parseDiscountPercentage;
}
