import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchesService } from '../batches/batches.service';
import { PaymentsService } from '../payments/payments.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateOrderDto } from './dto/create-order.dto';
export declare class OrdersService {
    private prisma;
    private batches;
    private payments;
    private coupons;
    private readonly logger;
    constructor(prisma: PrismaService, batches: BatchesService, payments: PaymentsService, coupons: CouponsService);
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
                createdAt: Date;
                total: Decimal;
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
            expiresAt: Date;
            createdAt: Date;
            updatedAt: Date;
            eventId: string;
            userId: string;
            status: import(".prisma/client").$Enums.OrderStatus;
            subtotal: Decimal;
            platformFee: Decimal;
            total: Decimal;
            stripePaymentIntentId: string | null;
            stripeChargeId: string | null;
            couponId: string | null;
            discountAmount: Decimal;
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
                createdAt: Date;
                updatedAt: Date;
                eventId: string;
                name: string;
                status: import(".prisma/client").$Enums.BatchStatus;
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
            createdAt: Date;
            total: Decimal;
            quantity: number;
            unitPrice: Decimal;
            batchId: string;
            orderId: string;
        })[];
        tickets: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            eventId: string;
            status: import(".prisma/client").$Enums.TicketStatus;
            cancelledAt: Date | null;
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
        expiresAt: Date;
        createdAt: Date;
        updatedAt: Date;
        eventId: string;
        userId: string;
        status: import(".prisma/client").$Enums.OrderStatus;
        subtotal: Decimal;
        platformFee: Decimal;
        total: Decimal;
        stripePaymentIntentId: string | null;
        stripeChargeId: string | null;
        couponId: string | null;
        discountAmount: Decimal;
        cancelledAt: Date | null;
        cancelReason: string | null;
        refundedAt: Date | null;
        stripeRefundId: string | null;
    }>;
    cancel(orderId: string, userId: string, reason?: string): Promise<void>;
    expireStaleOrders(): Promise<void>;
}
