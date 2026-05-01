import { Gender, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export declare class UpdateProfileDto {
    name?: string;
    email?: string;
    phone?: string;
    gender?: Gender;
    birthDate?: string;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
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
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        name: string;
        email: string;
        phone: string | null;
        role: import(".prisma/client").$Enums.Role;
        gender: import(".prisma/client").$Enums.Gender | null;
        birthDate: Date | null;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    updateAvatarUrl(userId: string, avatarUrl: string): Promise<{
        id: string;
        avatarUrl: string | null;
    }>;
    removeAvatarUrl(userId: string): Promise<{
        id: string;
        avatarUrl: string | null;
    }>;
    promoteToProducer(userId: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
    }>;
    promoteToStaff(userId: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
    }>;
    demoteToCustomer(userId: string): Promise<{
        id: string;
        name: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
    }>;
    listAll(page?: number, limit?: number, search?: string, role?: Role): Promise<{
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
    resetUserPassword(userId: string): Promise<{
        message: string;
    }>;
}
