import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
export declare class EventsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateEventDto, producerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string[];
        description: string;
        title: string;
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
        status: import(".prisma/client").$Enums.EventStatus;
        producerId: string;
    }>;
    findAll(query: {
        city?: string;
        category?: string;
        page?: number;
        limit?: number;
        search?: string;
        past?: boolean;
    }): Promise<{
        data: {
            id: string;
            title: string;
            slug: string;
            coverImage: string | null;
            venue: string;
            city: string;
            state: string;
            startDate: Date;
            endDate: Date;
            ageRating: number;
            category: string | null;
            batches: {
                name: string;
                price: import("@prisma/client/runtime/library").Decimal;
            }[];
        }[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    findBySlug(slug: string): Promise<{
        producer: {
            id: string;
            name: string;
        };
        batches: {
            id: string;
            name: string;
            description: string | null;
            status: import(".prisma/client").$Enums.BatchStatus;
            price: import("@prisma/client/runtime/library").Decimal;
            quantity: number;
            sold: number;
            startsAt: Date;
            endsAt: Date;
            ticketType: import(".prisma/client").$Enums.TicketType;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string[];
        description: string;
        title: string;
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
        status: import(".prisma/client").$Enums.EventStatus;
        producerId: string;
    }>;
    findProducerEvents(producerId: string, page?: number, limit?: number): Promise<{
        data: ({
            _count: {
                orders: number;
                tickets: number;
            };
            batches: {
                price: import("@prisma/client/runtime/library").Decimal;
                sold: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tags: string[];
            description: string;
            title: string;
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
            status: import(".prisma/client").$Enums.EventStatus;
            producerId: string;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    publish(eventId: string, producerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tags: string[];
        description: string;
        title: string;
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
        status: import(".prisma/client").$Enums.EventStatus;
        producerId: string;
    }>;
    cancel(eventId: string, producerId: string): Promise<void>;
    private getOwnedEvent;
}
