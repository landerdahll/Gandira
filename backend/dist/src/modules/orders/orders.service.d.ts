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
                quantity: number;
                orderId: string;
                batchId: string;
                unitPrice: Decimal;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.OrderStatus;
            total: Decimal;
            userId: string;
            expiresAt: Date;
            eventId: string;
            cancelledAt: Date | null;
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
            token: string;
            eventId: string;
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
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                status: import(".prisma/client").$Enums.BatchStatus;
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
            total: Decimal;
            quantity: number;
            orderId: string;
            batchId: string;
            unitPrice: Decimal;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.OrderStatus;
        total: Decimal;
        userId: string;
        expiresAt: Date;
        eventId: string;
        cancelledAt: Date | null;
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
