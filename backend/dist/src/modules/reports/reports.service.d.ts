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
            name: string;
            status: import(".prisma/client").$Enums.BatchStatus;
            quantity: number;
            price: import("@prisma/client/runtime/library").Decimal;
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
            user: {
                email: string;
                name: string;
            };
            items: ({
                batch: {
                    name: string;
                };
            } & {
                id: string;
                createdAt: Date;
                total: import("@prisma/client/runtime/library").Decimal;
                quantity: number;
                unitPrice: import("@prisma/client/runtime/library").Decimal;
                batchId: string;
                orderId: string;
            })[];
            event: {
                title: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            expiresAt: Date;
            total: import("@prisma/client/runtime/library").Decimal;
            eventId: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            subtotal: import("@prisma/client/runtime/library").Decimal;
            platformFee: import("@prisma/client/runtime/library").Decimal;
            stripePaymentIntentId: string | null;
            stripeChargeId: string | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
            refundedAt: Date | null;
            stripeRefundId: string | null;
        })[];
    }>;
}
