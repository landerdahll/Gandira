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
            cpf: string;
            name: string | null;
            email: string | null;
            phone: string | null;
            isActive: boolean;
            activatedAt: Date;
            deactivatedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
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
            eventId: string;
            discountAmount: Prisma.Decimal | null;
            clubMemberId: string;
            reservedOrderId: string | null;
            confirmedOrderId: string | null;
            batchId: string | null;
            originalAmount: Prisma.Decimal | null;
            finalAmount: Prisma.Decimal | null;
            reservedAt: Date | null;
            reservationExpiresAt: Date | null;
            confirmedAt: Date | null;
            releasedAt: Date | null;
            releaseReason: string | null;
        })[];
    } & {
        id: string;
        cpf: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        isActive: boolean;
        activatedAt: Date;
        deactivatedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            eventId: string;
            discountAmount: Prisma.Decimal | null;
            clubMemberId: string;
            reservedOrderId: string | null;
            confirmedOrderId: string | null;
            batchId: string | null;
            originalAmount: Prisma.Decimal | null;
            finalAmount: Prisma.Decimal | null;
            reservedAt: Date | null;
            reservationExpiresAt: Date | null;
            confirmedAt: Date | null;
            releasedAt: Date | null;
            releaseReason: string | null;
        })[];
    } & {
        id: string;
        cpf: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        isActive: boolean;
        activatedAt: Date;
        deactivatedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            eventId: string;
            discountAmount: Prisma.Decimal | null;
            clubMemberId: string;
            reservedOrderId: string | null;
            confirmedOrderId: string | null;
            batchId: string | null;
            originalAmount: Prisma.Decimal | null;
            finalAmount: Prisma.Decimal | null;
            reservedAt: Date | null;
            reservationExpiresAt: Date | null;
            confirmedAt: Date | null;
            releasedAt: Date | null;
            releaseReason: string | null;
        })[];
    } & {
        id: string;
        cpf: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        isActive: boolean;
        activatedAt: Date;
        deactivatedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
            eventId: string;
            discountAmount: Prisma.Decimal | null;
            clubMemberId: string;
            reservedOrderId: string | null;
            confirmedOrderId: string | null;
            batchId: string | null;
            originalAmount: Prisma.Decimal | null;
            finalAmount: Prisma.Decimal | null;
            reservedAt: Date | null;
            reservationExpiresAt: Date | null;
            confirmedAt: Date | null;
            releasedAt: Date | null;
            releaseReason: string | null;
        })[];
    } & {
        id: string;
        cpf: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        isActive: boolean;
        activatedAt: Date;
        deactivatedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
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
}
