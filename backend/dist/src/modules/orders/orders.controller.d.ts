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
            items: ({
                batch: {
                    name: string;
                    ticketType: import(".prisma/client").$Enums.TicketType;
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
                slug: string;
                coverImage: string | null;
                startDate: Date;
            };
            tickets: {
                id: string;
                status: import(".prisma/client").$Enums.TicketStatus;
            }[];
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
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    findOne(id: string, user: any): Promise<{
        items: ({
            batch: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                eventId: string;
                status: import(".prisma/client").$Enums.BatchStatus;
                quantity: number;
                price: import("@prisma/client/runtime/library").Decimal;
                sold: number;
                startsAt: Date;
                endsAt: Date;
                ticketType: import(".prisma/client").$Enums.TicketType;
                sortOrder: number;
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
            slug: string;
            coverImage: string | null;
            venue: string;
            startDate: Date;
        };
        tickets: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            token: string;
            eventId: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            cancelledAt: Date | null;
            batchId: string;
            orderId: string;
            holderName: string | null;
            holderEmail: string | null;
            holderCpf: string | null;
            qrCodeUrl: string | null;
        }[];
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
    }>;
    cancel(id: string, user: any, reason?: string): Promise<void>;
}
