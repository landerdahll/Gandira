import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchesService } from '../batches/batches.service';
import { PaymentsService } from '../payments/payments.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderExpirationService } from '../order-fulfillment/order-expiration.service';
import { ClubBenefitsService, DiscountType } from '../club-benefits/club-benefits.service';
export declare class OrdersService {
    private prisma;
    private batches;
    private payments;
    private coupons;
    private orderExpiration;
    private clubBenefits;
    private readonly logger;
    constructor(prisma: PrismaService, batches: BatchesService, payments: PaymentsService, coupons: CouponsService, orderExpiration: OrderExpirationService, clubBenefits: ClubBenefitsService);
    create(dto: CreateOrderDto, userId: string): Promise<{
        orderId: string;
        total: Decimal;
        expiresAt: Date;
        clientSecret: string | null;
        discountType: DiscountType;
        clubBenefit: {
            applied: boolean;
            reason: import("../club-benefits/club-benefits.service").ClubBenefitReason;
            discountPercentage: string | null;
            batchId: string | null;
            batchName: string | null;
            originalAmount: string | null;
            discountAmount: string | null;
            finalAmount: string | null;
            quantityDiscounted: number;
        };
    }>;
    findUserOrders(userId: string, page?: number, limit?: number): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    findOne(orderId: string, userId: string): Promise<any>;
    cancel(orderId: string, userId: string, reason?: string): Promise<void>;
    expireStaleOrders(): Promise<void>;
    private withBenefitResponse;
}
