import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
export declare class CouponsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(eventId: string, producerId: string, dto: CreateCouponDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        eventId: string;
        code: string;
        discount: import("@prisma/client/runtime/library").Decimal;
        maxUses: number | null;
        usedCount: number;
    }>;
    list(eventId: string, producerId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        eventId: string;
        code: string;
        discount: import("@prisma/client/runtime/library").Decimal;
        maxUses: number | null;
        usedCount: number;
    }[]>;
    remove(eventId: string, couponId: string, producerId: string): Promise<void>;
    validate(eventId: string, code: string): Promise<{
        id: string;
        code: string;
        discount: number;
        maxUses: number | null;
        usedCount: number;
    }>;
}
