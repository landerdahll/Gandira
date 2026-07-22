import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersController {
    private orders;
    constructor(orders: OrdersService);
    create(dto: CreateOrderDto, user: any): Promise<{
        orderId: string;
        total: import("@prisma/client/runtime/library").Decimal;
        expiresAt: Date;
        clientSecret: string | null;
        discountType: import("../club-benefits/club-benefits.service").DiscountType;
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
    findAll(user: any, page: number, limit: number): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    findOne(id: string, user: any): Promise<any>;
    cancel(id: string, user: any, reason?: string): Promise<void>;
}
