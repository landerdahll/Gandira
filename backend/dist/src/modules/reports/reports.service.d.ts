import { PrismaService } from '../../prisma/prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    getEventReport(eventId: string, _producerId: string): Promise<{
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
            status: import(".prisma/client").$Enums.BatchStatus;
            name: string;
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
    getProducerDashboard(producerId: string): Promise<{
        summary: {
            events: number;
            totalRevenue: number;
            totalTicketsSold: number;
        };
        recentOrders: ({
            event: {
                title: string;
            };
            user: {
                name: string;
                email: string;
            };
            items: ({
                batch: {
                    name: string;
                };
            } & {
                id: string;
                createdAt: Date;
                orderId: string;
                batchId: string;
                total: import("@prisma/client/runtime/library").Decimal;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            eventId: string;
            cancelledAt: Date | null;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            platformFee: import("@prisma/client/runtime/library").Decimal;
            total: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            expiresAt: Date;
            userId: string;
            stripePaymentIntentId: string | null;
            stripeChargeId: string | null;
            couponId: string | null;
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
}
