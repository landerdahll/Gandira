import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchesService } from '../batches/batches.service';
import { PaymentsService } from '../payments/payments.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderExpirationService } from '../order-fulfillment/order-expiration.service';
export declare class OrdersService {
    private prisma;
    private batches;
    private payments;
    private coupons;
    private orderExpiration;
    private readonly logger;
    constructor(prisma: PrismaService, batches: BatchesService, payments: PaymentsService, coupons: CouponsService, orderExpiration: OrderExpirationService);
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
                total: Decimal;
                orderId: string;
                batchId: string;
                quantity: number;
                unitPrice: Decimal;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            total: Decimal;
            cancelledAt: Date | null;
            expiresAt: Date;
            eventId: string;
            userId: string;
            subtotal: Decimal;
            platformFee: Decimal;
            stripePaymentIntentId: string | null;
            stripeChargeId: string | null;
            couponId: string | null;
            discountAmount: Decimal;
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
        tickets: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.TicketStatus;
            cancelledAt: Date | null;
            eventId: string;
            token: string;
            orderId: string;
            batchId: string;
            ownerUserId: string;
            holderName: string | null;
            holderEmail: string | null;
            holderCpf: string | null;
            qrCodeUrl: string | null;
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
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                status: import(".prisma/client").$Enums.BatchStatus;
                eventId: string;
                price: Decimal;
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
            total: Decimal;
            orderId: string;
            batchId: string;
            quantity: number;
            unitPrice: Decimal;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        total: Decimal;
        cancelledAt: Date | null;
        expiresAt: Date;
        eventId: string;
        userId: string;
        subtotal: Decimal;
        platformFee: Decimal;
        stripePaymentIntentId: string | null;
        stripeChargeId: string | null;
        couponId: string | null;
        discountAmount: Decimal;
        cancelReason: string | null;
        refundedAt: Date | null;
        stripeRefundId: string | null;
    }>;
    cancel(orderId: string, userId: string, reason?: string): Promise<void>;
    expireStaleOrders(): Promise<void>;
}
