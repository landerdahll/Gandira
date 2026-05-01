import { Role } from '@prisma/client';
import { UsersService, UpdateProfileDto, ChangePasswordDto } from './users.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
export declare class UsersController {
    private users;
    private cloudinary;
    constructor(users: UsersService, cloudinary: CloudinaryService);
    me(user: any): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        email: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.Role;
        gender: import(".prisma/client").$Enums.Gender | null;
        birthDate: Date | null;
        avatarUrl: string | null;
        isVerified: boolean;
    }>;
    update(user: any, dto: UpdateProfileDto): Promise<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.Role;
        gender: import(".prisma/client").$Enums.Gender | null;
        birthDate: Date | null;
    }>;
    changePassword(user: any, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    uploadAvatar(user: any, file: Express.Multer.File): Promise<{
        id: string;
        avatarUrl: string | null;
    }>;
    removeAvatar(user: any): Promise<{
        id: string;
        avatarUrl: string | null;
    }>;
    promote(id: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
    }>;
    promoteStaff(id: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
    }>;
    demote(id: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
    }>;
    listAll(page: number, limit: number, search?: string, role?: Role): Promise<{
        data: {
            id: string;
            createdAt: Date;
            _count: {
                orders: number;
            };
            name: string;
            email: string;
            phone: string | null;
            role: import(".prisma/client").$Enums.Role;
            gender: import(".prisma/client").$Enums.Gender | null;
            birthDate: Date | null;
            isVerified: boolean;
            isActive: boolean;
        }[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
    resetPassword(id: string): Promise<{
        message: string;
    }>;
}
