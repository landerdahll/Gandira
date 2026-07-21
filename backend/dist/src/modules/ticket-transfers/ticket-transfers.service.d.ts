import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
type InviteRecipient = Pick<User, 'id' | 'email' | 'name'>;
type CompletedInviteTransfer = Prisma.TicketTransferGetPayload<{
    include: {
        ticket: true;
        sender: true;
        event: true;
    };
}>;
export declare class TicketTransfersService {
    private prismaService;
    private mail;
    private config;
    private readonly logger;
    constructor(prismaService: PrismaService, mail: MailService, config: ConfigService);
    private get prisma();
    hashInviteToken(rawToken: string): string;
    request(ticketId: string, senderUserId: string, rawEmail: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.TicketTransferStatus;
        recipientEmail: string;
        expiresAt: Date | null;
    }>;
    inspectInvite(rawToken: string, email: string): Promise<{
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
    prepareInviteCompletion(rawToken: string, email: string): Promise<{
        nextToken: string;
        qrCodeUrl: string;
    }>;
    completeInviteInTransaction(tx: Prisma.TransactionClient, rawToken: string, user: InviteRecipient, prepared: {
        nextToken: string;
        qrCodeUrl: string;
    }): Promise<{
        transfer: {
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
                latitude: Prisma.Decimal | null;
                longitude: Prisma.Decimal | null;
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
                id: string;
                email: string;
                cpf: string | null;
                password: string;
                name: string;
                phone: string | null;
                role: import(".prisma/client").$Enums.Role;
                gender: import(".prisma/client").$Enums.Gender | null;
                birthDate: Date | null;
                avatarUrl: string | null;
                isVerified: boolean;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
            };
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
        };
        user: InviteRecipient;
    }>;
    notifyInviteCompleted(transfer: CompletedInviteTransfer, user: InviteRecipient): void;
    cancel(id: string, senderUserId: string): Promise<{
        status: string;
    }>;
    expirePendingInvites(): Promise<void>;
    private expire;
    ticketStatus(ticketId: string, userId: string): Promise<({
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
    mine(userId: string): Prisma.PrismaPromise<({
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
    adminList(query: any): Promise<{
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
                    total: Prisma.Decimal;
                    eventId: string;
                    cancelledAt: Date | null;
                    expiresAt: Date;
                    userId: string;
                    subtotal: Prisma.Decimal;
                    platformFee: Prisma.Decimal;
                    stripePaymentIntentId: string | null;
                    stripeChargeId: string | null;
                    couponId: string | null;
                    discountAmount: Prisma.Decimal;
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
            latitude: Prisma.Decimal | null;
            longitude: Prisma.Decimal | null;
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
                price: Prisma.Decimal;
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
                total: Prisma.Decimal;
                eventId: string;
                cancelledAt: Date | null;
                expiresAt: Date;
                userId: string;
                subtotal: Prisma.Decimal;
                platformFee: Prisma.Decimal;
                stripePaymentIntentId: string | null;
                stripeChargeId: string | null;
                couponId: string | null;
                discountAmount: Prisma.Decimal;
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
            metadata: Prisma.JsonValue | null;
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
    private sendRequestedEmails;
    private sendCompletedEmails;
}
export {};
