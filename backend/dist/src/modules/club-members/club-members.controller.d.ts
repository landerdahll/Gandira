import { ClubMembersService } from './club-members.service';
import { CreateClubMemberDto } from './dto/create-club-member.dto';
export declare class ClubMembersController {
    private readonly clubMembers;
    constructor(clubMembers: ClubMembersService);
    list(page: number, limit: number, search?: string): Promise<{
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
    create(dto: CreateClubMemberDto, admin: {
        id: string;
    }): Promise<{
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
            discountAmount: import("@prisma/client/runtime/library").Decimal | null;
            clubMemberId: string;
            reservedOrderId: string | null;
            confirmedOrderId: string | null;
            batchId: string | null;
            originalAmount: import("@prisma/client/runtime/library").Decimal | null;
            finalAmount: import("@prisma/client/runtime/library").Decimal | null;
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
            discountAmount: import("@prisma/client/runtime/library").Decimal | null;
            clubMemberId: string;
            reservedOrderId: string | null;
            confirmedOrderId: string | null;
            batchId: string | null;
            originalAmount: import("@prisma/client/runtime/library").Decimal | null;
            finalAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    activate(id: string, admin: {
        id: string;
    }): Promise<{
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
            discountAmount: import("@prisma/client/runtime/library").Decimal | null;
            clubMemberId: string;
            reservedOrderId: string | null;
            confirmedOrderId: string | null;
            batchId: string | null;
            originalAmount: import("@prisma/client/runtime/library").Decimal | null;
            finalAmount: import("@prisma/client/runtime/library").Decimal | null;
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
    deactivate(id: string, admin: {
        id: string;
    }): Promise<{
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
            discountAmount: import("@prisma/client/runtime/library").Decimal | null;
            clubMemberId: string;
            reservedOrderId: string | null;
            confirmedOrderId: string | null;
            batchId: string | null;
            originalAmount: import("@prisma/client/runtime/library").Decimal | null;
            finalAmount: import("@prisma/client/runtime/library").Decimal | null;
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
}
