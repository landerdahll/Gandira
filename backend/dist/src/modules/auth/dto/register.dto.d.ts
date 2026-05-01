import { Gender } from '@prisma/client';
export declare class RegisterDto {
    name: string;
    email: string;
    password: string;
    phone?: string;
    cpf?: string;
    gender?: Gender;
    birthDate?: string;
}
