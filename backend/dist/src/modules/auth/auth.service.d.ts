import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';
export declare class AuthService {
    private prisma;
    private jwt;
    private config;
    private mail;
    private readonly logger;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService, mail: MailService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isVerified: boolean;
        };
    }>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    resendVerificationByEmail(email: string): Promise<{
        message: string;
    }>;
    private dispatchVerificationEmail;
    login(dto: LoginDto, ipAddress?: string): Promise<{
        requires2FA: true;
        twoFactorToken: string;
    } | {
        accessToken: string;
        refreshToken: string;
        requires2FA: false;
        user: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isVerified: boolean;
        };
        twoFactorToken?: undefined;
    }>;
    verify2FA(twoFactorToken: string, code: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            email: string;
            name: string;
            role: import(".prisma/client").$Enums.Role;
            isVerified: boolean;
        };
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(refreshToken: string): Promise<void>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
    private generateTokenPair;
    private auditLog;
}
