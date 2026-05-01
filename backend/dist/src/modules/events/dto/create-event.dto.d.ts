export declare class CreateEventDto {
    title: string;
    description: string;
    venue: string;
    address: string;
    city: string;
    state: string;
    zipCode?: string;
    startDate: string;
    endDate: string;
    doorsOpen?: string;
    ageRating?: number;
    category?: string;
    tags?: string[];
    coverImage?: string;
}
