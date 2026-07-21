import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
declare class ValidateCouponDto {
    eventId: string;
    code: string;
}
export declare class CouponsController {
    private coupons;
    constructor(coupons: CouponsService);
    create(eventId: string, dto: CreateCouponDto, user: any): Promise<{
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
    list(eventId: string, user: any): Promise<{
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
    remove(eventId: string, couponId: string, user: any): Promise<void>;
}
export declare class CouponsPublicController {
    private coupons;
    constructor(coupons: CouponsService);
    validate(dto: ValidateCouponDto): Promise<{
        id: string;
        code: string;
        discount: number;
        maxUses: number | null;
        usedCount: number;
    }>;
}
export {};
