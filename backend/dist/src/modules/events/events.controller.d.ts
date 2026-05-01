import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
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
                price: import("@prisma/client/runtime/library").Decimal;
                name: string;
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
            description: string | null;
            status: import(".prisma/client").$Enums.BatchStatus;
            price: import("@prisma/client/runtime/library").Decimal;
            name: string;
            quantity: number;
            sold: number;
            startsAt: Date;
            endsAt: Date;
            ticketType: import(".prisma/client").$Enums.TicketType;
        }[];
    } & {
        id: string;
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
        status: import(".prisma/client").$Enums.EventStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(dto: CreateEventDto, user: any): Promise<{
        id: string;
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
        status: import(".prisma/client").$Enums.EventStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
    uploadImage(file: Express.Multer.File): Promise<{
        url: string;
    }>;
    myEvents(user: any, page: number, limit: number): Promise<{
        data: ({
            batches: {
                price: import("@prisma/client/runtime/library").Decimal;
                sold: number;
            }[];
            _count: {
                orders: number;
                tickets: number;
            };
        } & {
            id: string;
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
            status: import(".prisma/client").$Enums.EventStatus;
            createdAt: Date;
            updatedAt: Date;
        })[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    publish(id: string, user: any): Promise<{
        id: string;
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
        status: import(".prisma/client").$Enums.EventStatus;
        createdAt: Date;
        updatedAt: Date;
    }>;
    cancel(id: string, user: any): Promise<void>;
}
