import { RequestTransferDto } from './dto/request-transfer.dto';
import { TicketTransfersService } from './ticket-transfers.service';
export declare class TicketTransfersController {
    private readonly service;
    constructor(service: TicketTransfersService);
    request(ticketId: string, dto: RequestTransferDto, user: any): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.TicketTransferStatus;
        recipientEmail: string;
        expiresAt: Date | null;
    }>;
    status(ticketId: string, user: any): Promise<({
        sender: {
            name: string;
        };
        recipient: {
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TicketTransferStatus;
        ticketId: string;
        eventId: string;
        senderUserId: string;
        recipientUserId: string | null;
        recipientEmail: string;
        invitationTokenHash: string | null;
        requestedAt: Date;
        completedAt: Date | null;
        cancelledAt: Date | null;
        expiresAt: Date | null;
        previousQrIdentifier: string | null;
        newQrIdentifier: string | null;
        cancellationReason: string | null;
    }) | null>;
    cancel(id: string, user: any): Promise<{
        status: string;
    }>;
    mine(user: any): import(".prisma/client").Prisma.PrismaPromise<({
        event: {
            title: string;
        };
        ticket: {
            id: string;
        };
        sender: {
            name: string;
        };
        recipient: {
            name: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TicketTransferStatus;
        ticketId: string;
        eventId: string;
        senderUserId: string;
        recipientUserId: string | null;
        recipientEmail: string;
        invitationTokenHash: string | null;
        requestedAt: Date;
        completedAt: Date | null;
        cancelledAt: Date | null;
        expiresAt: Date | null;
        previousQrIdentifier: string | null;
        newQrIdentifier: string | null;
        cancellationReason: string | null;
    })[]>;
    adminList(query: any, page: number, limit: number): Promise<{
        data: ({
            event: {
                title: string;
            };
            ticket: {
                batch: {
                    name: string;
                };
                order: {
                    user: {
                        email: string;
                        name: string;
                    };
                } & {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    status: import(".prisma/client").$Enums.OrderStatus;
                    total: import("@prisma/client/runtime/library").Decimal;
                    eventId: string;
                    cancelledAt: Date | null;
                    expiresAt: Date;
                    userId: string;
                    subtotal: import("@prisma/client/runtime/library").Decimal;
                    platformFee: import("@prisma/client/runtime/library").Decimal;
                    stripePaymentIntentId: string | null;
                    stripeChargeId: string | null;
                    couponId: string | null;
                    discountAmount: import("@prisma/client/runtime/library").Decimal;
                    cancelReason: string | null;
                    refundedAt: Date | null;
                    stripeRefundId: string | null;
                };
                checkIn: {
                    id: string;
                    ticketId: string;
                    eventId: string;
                    staffId: string | null;
                    method: import(".prisma/client").$Enums.CheckInMethod;
                    notes: string | null;
                    checkedAt: Date;
                } | null;
                owner: {
                    email: string;
                    name: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.TicketStatus;
                eventId: string;
                cancelledAt: Date | null;
                token: string;
                orderId: string;
                batchId: string;
                ownerUserId: string;
                holderName: string | null;
                holderEmail: string | null;
                holderCpf: string | null;
                qrCodeUrl: string | null;
            };
            sender: {
                email: string;
                name: string;
            };
            recipient: {
                email: string;
                name: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.TicketTransferStatus;
            ticketId: string;
            eventId: string;
            senderUserId: string;
            recipientUserId: string | null;
            recipientEmail: string;
            invitationTokenHash: string | null;
            requestedAt: Date;
            completedAt: Date | null;
            cancelledAt: Date | null;
            expiresAt: Date | null;
            previousQrIdentifier: string | null;
            newQrIdentifier: string | null;
            cancellationReason: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    adminDetail(id: string): Promise<{
        event: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string;
            slug: string;
            coverImage: string | null;
            bannerImage: string | null;
            venue: string;
            address: string;
            city: string;
            state: string;
            zipCode: string | null;
            latitude: import("@prisma/client/runtime/library").Decimal | null;
            longitude: import("@prisma/client/runtime/library").Decimal | null;
            startDate: Date;
            endDate: Date;
            doorsOpen: Date | null;
            ageRating: number;
            category: string | null;
            tags: string[];
            status: import(".prisma/client").$Enums.EventStatus;
            allowTicketTransfers: boolean;
            producerId: string;
        };
        ticket: {
            batch: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                status: import(".prisma/client").$Enums.BatchStatus;
                eventId: string;
                price: import("@prisma/client/runtime/library").Decimal;
                quantity: number;
                sold: number;
                startsAt: Date;
                endsAt: Date;
                ticketType: import(".prisma/client").$Enums.TicketType;
                sortOrder: number;
            };
            order: {
                user: {
                    email: string;
                    name: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.OrderStatus;
                total: import("@prisma/client/runtime/library").Decimal;
                eventId: string;
                cancelledAt: Date | null;
                expiresAt: Date;
                userId: string;
                subtotal: import("@prisma/client/runtime/library").Decimal;
                platformFee: import("@prisma/client/runtime/library").Decimal;
                stripePaymentIntentId: string | null;
                stripeChargeId: string | null;
                couponId: string | null;
                discountAmount: import("@prisma/client/runtime/library").Decimal;
                cancelReason: string | null;
                refundedAt: Date | null;
                stripeRefundId: string | null;
            };
            checkIn: {
                id: string;
                ticketId: string;
                eventId: string;
                staffId: string | null;
                method: import(".prisma/client").$Enums.CheckInMethod;
                notes: string | null;
                checkedAt: Date;
            } | null;
            owner: {
                email: string;
                name: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.TicketStatus;
            eventId: string;
            cancelledAt: Date | null;
            token: string;
            orderId: string;
            batchId: string;
            ownerUserId: string;
            holderName: string | null;
            holderEmail: string | null;
            holderCpf: string | null;
            qrCodeUrl: string | null;
        };
        sender: {
            email: string;
            name: string;
        };
        recipient: {
            email: string;
            name: string;
        } | null;
        history: {
            id: string;
            createdAt: Date;
            ticketId: string;
            action: string;
            actorUserId: string | null;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            transferId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.TicketTransferStatus;
        ticketId: string;
        eventId: string;
        senderUserId: string;
        recipientUserId: string | null;
        recipientEmail: string;
        invitationTokenHash: string | null;
        requestedAt: Date;
        completedAt: Date | null;
        cancelledAt: Date | null;
        expiresAt: Date | null;
        previousQrIdentifier: string | null;
        newQrIdentifier: string | null;
        cancellationReason: string | null;
    }>;
}
