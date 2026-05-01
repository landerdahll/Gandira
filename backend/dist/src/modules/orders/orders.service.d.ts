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
                total: Decimal;
                orderId: string;
                batchId: string;
                unitPrice: Decimal;
            })[];
        } & {
            id: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            createdAt: Date;
            updatedAt: Date;
            eventId: string;
            total: Decimal;
            cancelledAt: Date | null;
            userId: string;
            subtotal: Decimal;
            platformFee: Decimal;
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
    findOne(orderId: string, userId: string): Promise<{
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
                price: Decimal;
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
            total: Decimal;
            orderId: string;
            batchId: string;
            unitPrice: Decimal;
        })[];
    } & {
        id: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        createdAt: Date;
        updatedAt: Date;
        eventId: string;
        total: Decimal;
        cancelledAt: Date | null;
        userId: string;
        subtotal: Decimal;
        platformFee: Decimal;
        stripePaymentIntentId: string | null;
        stripeChargeId: string | null;
        cancelReason: string | null;
        refundedAt: Date | null;
        stripeRefundId: string | null;
        expiresAt: Date;
    }>;
    cancel(orderId: string, userId: string, reason?: string): Promise<void>;
    expireStaleOrders(): Promise<void>;
}
