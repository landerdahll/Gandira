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
            subtotal: number | import("@prisma/client/runtime/library").Decimal;
            platformFee: number | import("@prisma/client/runtime/library").Decimal;
            total: number;
        };
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
    getProducerDashboard(_producerId: string): Promise<{
        summary: {
            events: number;
            totalRevenue: number | import("@prisma/client/runtime/library").Decimal;
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
                quantity: number;
                total: import("@prisma/client/runtime/library").Decimal;
                orderId: string;
                batchId: string;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
            })[];
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            eventId: string;
            total: import("@prisma/client/runtime/library").Decimal;
            cancelledAt: Date | null;
            userId: string;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            platformFee: import("@prisma/client/runtime/library").Decimal;
            stripePaymentIntentId: string | null;
            stripeChargeId: string | null;
            cancelReason: string | null;
            refundedAt: Date | null;
            stripeRefundId: string | null;
            expiresAt: Date;
        })[];
    }>;
}
