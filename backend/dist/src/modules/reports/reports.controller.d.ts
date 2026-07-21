import { ReportsService } from './reports.service';
export declare class ReportsController {
    private reports;
    constructor(reports: ReportsService);
    dashboard(user: any): Promise<{
        summary: {
            events: number;
            totalRevenue: number;
            totalTicketsSold: number;
        };
        recentOrders: ({
            user: {
                email: string;
                name: string;
            };
            event: {
                title: string;
            };
            items: ({
                batch: {
                    name: string;
                };
            } & {
                id: string;
                createdAt: Date;
                total: import("@prisma/client/runtime/library").Decimal;
                orderId: string;
                batchId: string;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            total: import("@prisma/client/runtime/library").Decimal;
            eventId: string;
            cancelledAt: Date | null;
            expiresAt: Date;
            userId: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            platformFee: import("@prisma/client/runtime/library").Decimal;
            stripePaymentIntentId: string | null;
            stripeChargeId: string | null;
            couponId: string | null;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            cancelReason: string | null;
            refundedAt: Date | null;
            stripeRefundId: string | null;
        })[];
        revenueByEvent: {
            [k: string]: {
                total: number;
                discount: number;
            };
        };
        couponBreakdown: {
            id: string;
            code: string;
            discountPct: number;
            ticketsCount: number;
            maxUses: number | null;
            eventId: string;
            eventTitle: string;
            totalDiscount: number;
        }[];
    }>;
    eventReport(eventId: string, user: any): Promise<{
        event: {
            id: string;
            title: string;
            startDate: Date;
            status: import(".prisma/client").$Enums.EventStatus;
        };
        tickets: {
            total: number;
            active: number;
            used: number;
            cancelled: number;
        };
        revenue: {
            orders: number;
            subtotal: number;
            platformFee: number;
            discount: number;
            total: number;
        };
        coupons: {
            id: string;
            code: string;
            discountPct: number;
            ticketsCount: number;
            maxUses: number | null;
            totalDiscount: number;
        }[];
        checkIns: {
            count: number;
            rate: string;
        };
        batches: {
            revenue: number;
            available: number;
            occupancyRate: string;
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.BatchStatus;
            price: import("@prisma/client/runtime/library").Decimal;
            quantity: number;
            sold: number;
            ticketType: import(".prisma/client").$Enums.TicketType;
        }[];
        audience: {
            gender: {
                gender: import(".prisma/client").$Enums.Gender | null;
                count: number;
                pct: number;
            }[];
            totalWithProfile: number;
            avgAge: number | null;
        };
    }>;
}
