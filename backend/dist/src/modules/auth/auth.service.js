"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto_util_1 = require("../../common/utils/crypto.util");
const mail_service_1 = require("../mail/mail.service");
const BCRYPT_ROUNDS = 12;
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwt, config, mail) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
        this.mail = mail;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async register(dto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists)
            throw new common_1.ConflictException('E-mail já cadastrado');
        if (dto.cpf) {
            const cpfExists = await this.prisma.user.findUnique({
                where: { cpf: dto.cpf.replace(/\D/g, '') },
            });
            if (cpfExists)
                throw new common_1.ConflictException('CPF já cadastrado');
        }
        const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        const cpf = dto.cpf ? dto.cpf.replace(/\D/g, '') : undefined;
        const user = await this.prisma.user.create({
            data: {
                name: dto.name,
                email: dto.email.toLowerCase().trim(),
                password,
                phone: dto.phone,
                cpf,
                gender: dto.gender,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            },
            select: { id: true, email: true, name: true, role: true },
        });
        this.logger.log(`New user registered: ${user.email}`);
        await this.auditLog(user.id, 'USER_REGISTERED', 'User', user.id);
        const tokens = await this.generateTokenPair(user.id, user.email, user.role);
        return { user, ...tokens };
    }
    async login(dto, ipAddress) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase().trim() },
        });
        const dummyHash = '$2b$12$invalid.hash.for.timing.safety.do.not.remove';
        const isValid = user
            ? await bcrypt.compare(dto.password, user.password)
            : await bcrypt.compare(dto.password, dummyHash);
        if (!user || !isValid || !user.isActive) {
            await this.auditLog(null, 'LOGIN_FAILED', 'User', dto.email, { ipAddress });
            throw new common_1.UnauthorizedException('Credenciais inválidas');
        }
        this.logger.log(`User login: ${user.email}`);
        await this.auditLog(user.id, 'LOGIN_SUCCESS', 'User', user.id, { ipAddress });
        const tokens = await this.generateTokenPair(user.id, user.email, user.role);
        return {
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
            ...tokens,
        };
    }
    async refresh(refreshToken) {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        if (!stored || stored.isRevoked || stored.expiresAt < new Date() || !stored.user.isActive) {
            throw new common_1.UnauthorizedException('Refresh token inválido');
        }
        await this.prisma.refreshToken.update({
            where: { id: stored.id },
            data: { isRevoked: true },
        });
        return this.generateTokenPair(stored.user.id, stored.user.email, stored.user.role);
    }
    async logout(refreshToken) {
        await this.prisma.refreshToken.updateMany({
            where: { token: refreshToken },
            data: { isRevoked: true },
        });
    }
    async forgotPassword(email) {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user || !user.isActive)
            return;
        await this.prisma.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
            data: { expiresAt: new Date() },
        });
        const token = (0, crypto_util_1.generateSecureToken)(32);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await this.prisma.passwordResetToken.create({
            data: { userId: user.id, token, expiresAt },
        });
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
        const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
        await this.mail.sendPasswordReset(user.email, user.name, resetUrl);
        this.logger.log(`Password reset requested for ${user.email}`);
    }
    async resetPassword(token, newPassword) {
        const record = await this.prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Link inválido ou expirado');
        }
        const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: record.userId },
                data: { password: hashed },
            }),
            this.prisma.passwordResetToken.update({
                where: { id: record.id },
                data: { usedAt: new Date() },
            }),
            this.prisma.refreshToken.updateMany({
                where: { userId: record.userId },
                data: { isRevoked: true },
            }),
        ]);
        this.logger.log(`Password reset completed for user ${record.userId}`);
        await this.auditLog(record.userId, 'PASSWORD_RESET', 'User', record.userId);
    }
    async generateTokenPair(userId, email, role) {
        const payload = { sub: userId, email, role };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwt.signAsync(payload),
            (0, crypto_util_1.generateSecureToken)(40),
        ]);
        const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', '7d');
        const days = parseInt(refreshExpiresIn);
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        await this.prisma.refreshToken.create({
            data: { userId, token: refreshToken, expiresAt },
        });
        return { accessToken, refreshToken };
    }
    async auditLog(userId, action, entity, entityId, metadata) {
        await this.prisma.auditLog.create({
            data: { userId, action, entity, entityId, metadata },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map