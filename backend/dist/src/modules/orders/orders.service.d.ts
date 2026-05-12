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
            items: ({
                batch: {
                    name: string;
                    ticketType: import(".prisma/client").$Enums.TicketType;
                };
            } & {
                id: string;
                createdAt: Date;
                total: Decimal;
                quantity: number;
                unitPrice: Decimal;
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
            total: Decimal;
            eventId: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            subtotal: Decimal;
            platformFee: Decimal;
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
    findOne(orderId: string, userId: string): Promise<{
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
                price: Decimal;
                sold: number;
                startsAt: Date;
                endsAt: Date;
                ticketType: import(".prisma/client").$Enums.TicketType;
                sortOrder: number;
            };
        } & {
            id: string;
            createdAt: Date;
            total: Decimal;
            quantity: number;
            unitPrice: Decimal;
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
        total: Decimal;
        eventId: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        subtotal: Decimal;
        platformFee: Decimal;
        stripePaymentIntentId: string | null;
        stripeChargeId: string | null;
        cancelledAt: Date | null;
        cancelReason: string | null;
        refundedAt: Date | null;
        stripeRefundId: string | null;
    }>;
    cancel(orderId: string, userId: string, reason?: string): Promise<void>;
    expireStaleOrders(): Promise<void>;
}
