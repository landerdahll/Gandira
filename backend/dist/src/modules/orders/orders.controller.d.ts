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
    }>;
    findAll(user: any, page: number, limit: number): Promise<{
        data: ({
            tickets: {
                id: string;
                status: import(".prisma/client").$Enums.TicketStatus;
            }[];
            event: {
                title: string;
                slug: string;
                coverImage: string | null;
                startDate: Date;
            };
            items: ({
                batch: {
                    name: string;
                    ticketType: import(".prisma/client").$Enums.TicketType;
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
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    findOne(id: string, user: any): Promise<{
        tickets: {
            id: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            createdAt: Date;
            updatedAt: Date;
            eventId: string;
            token: string;
            holderName: string | null;
            holderEmail: string | null;
            holderCpf: string | null;
            qrCodeUrl: string | null;
            cancelledAt: Date | null;
            orderId: string;
            batchId: string;
        }[];
        event: {
            title: string;
            slug: string;
            coverImage: string | null;
            venue: string;
            startDate: Date;
        };
        items: ({
            batch: {
                id: string;
                description: string | null;
                status: import(".prisma/client").$Enums.BatchStatus;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                price: import("@prisma/client/runtime/library").Decimal;
                eventId: string;
                quantity: number;
                sold: number;
                startsAt: Date;
                endsAt: Date;
                ticketType: import(".prisma/client").$Enums.TicketType;
                sortOrder: number;
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
    }>;
    cancel(id: string, user: any, reason?: string): Promise<void>;
}
