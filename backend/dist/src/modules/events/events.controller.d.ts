import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
export declare class EventsController {
    private events;
    private cloudinary;
    constructor(events: EventsService, cloudinary: CloudinaryService);
    findAll(city?: string, category?: string, search?: string, past?: string, page?: number, limit?: number): Promise<{
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
    findOne(slug: string): Promise<{
        producer: {
            id: string;
            name: string;
        };
        batches: {
            id: string;
            name: string;
            status: import(".prisma/client").$Enums.BatchStatus;
            quantity: number;
            description: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            sold: number;
            startsAt: Date;
            endsAt: Date;
            ticketType: import(".prisma/client").$Enums.TicketType;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.EventStatus;
        producerId: string;
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
    }>;
    create(dto: CreateEventDto, user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.EventStatus;
        producerId: string;
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
    }>;
    uploadImage(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    findForEdit(id: string, user: any): Promise<{
        batches: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            eventId: string;
            name: string;
            status: import(".prisma/client").$Enums.BatchStatus;
            quantity: number;
            description: string | null;
            price: import("@prisma/client/runtime/library").Decimal;
            sold: number;
            startsAt: Date;
            endsAt: Date;
            ticketType: import(".prisma/client").$Enums.TicketType;
            sortOrder: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.EventStatus;
        producerId: string;
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
    }>;
    update(id: string, dto: UpdateEventDto, user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.EventStatus;
        producerId: string;
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
    }>;
    myEvents(user: any, page: number, limit: number): Promise<{
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
            status: import(".prisma/client").$Enums.EventStatus;
            producerId: string;
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
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    publish(id: string, user: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.EventStatus;
        producerId: string;
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
    }>;
    cancel(id: string, user: any): Promise<void>;
}
