import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchesService } from '../batches/batches.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersService {
    private prisma;
    private batches;
    private payments;
    private readonly logger;
    constructor(prisma: PrismaService, batches: BatchesService, payments: PaymentsService);
    create(dto: CreateOrderDto, userId: string): Promise<{
        orderId: string;
        total: Decimal;
        expiresAt: Date;
        clientSecret: string | null;
    }>;
    findUserOrders(userId: string, page?: number, limit?: number): Promise<{
        data: ({
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
                total: Decimal;
                createdAt: Date;
                quantity: number;
                unitPrice: Decimal;
                batchId: string;
                orderId: string;
            })[];
            tickets: {
                id: string;
                status: import(".prisma/client").$Enums.TicketStatus;
            }[];
        } & {
            id: string;
            userId: string;
            eventId: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            subtotal: Decimal;
            platformFee: Decimal;
            total: Decimal;
            stripePaymentIntentId: string | null;
            stripeChargeId: string | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
            refundedAt: Date | null;
            stripeRefundId: string | null;
            expiresAt: Date;
            createdAt: Date;
            updatedAt: Date;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    findOne(orderId: string, userId: string): Promise<{
        event: {
            title: string;
            slug: string;
            coverImage: string | null;
            venue: string;
            startDate: Date;
        };
        items: ({
            batch: {
                name: string;
                id: string;
                eventId: string;
                status: import(".prisma/client").$Enums.BatchStatus;
                createdAt: Date;
                updatedAt: Date;
                quantity: number;
                description: string | null;
                price: Decimal;
                sold: number;
                startsAt: Date;
                endsAt: Date;
                ticketType: import(".prisma/client").$Enums.TicketType;
                sortOrder: number;
            };
        } & {
            id: string;
            total: Decimal;
            createdAt: Date;
            quantity: number;
            unitPrice: Decimal;
            batchId: string;
            orderId: string;
        })[];
        tickets: {
            id: string;
            eventId: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            cancelledAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            batchId: string;
            orderId: string;
            token: string;
            holderName: string | null;
            holderEmail: string | null;
            holderCpf: string | null;
            qrCodeUrl: string | null;
        }[];
    } & {
        id: string;
        userId: string;
        eventId: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        subtotal: Decimal;
        platformFee: Decimal;
        total: Decimal;
        stripePaymentIntentId: string | null;
        stripeChargeId: string | null;
        cancelledAt: Date | null;
        cancelReason: string | null;
        refundedAt: Date | null;
        stripeRefundId: string | null;
        expiresAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    cancel(orderId: string, userId: string, reason?: string): Promise<void>;
    expireStaleOrders(): Promise<void>;
}
