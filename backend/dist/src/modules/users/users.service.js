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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = exports.ChangePasswordDto = exports.UpdateProfileDto = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../prisma/prisma.service");
const BCRYPT_ROUNDS = 12;
class UpdateProfileDto {
}
exports.UpdateProfileDto = UpdateProfileDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(20),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.Gender),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "gender", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "birthDate", void 0);
class ChangePasswordDto {
}
exports.ChangePasswordDto = ChangePasswordDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.Matches)(/[A-Z]/, { message: 'Deve ter ao menos 1 letra maiúscula' }),
    (0, class_validator_1.Matches)(/\d/, { message: 'Deve ter ao menos 1 número' }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, name: true, phone: true,
                role: true, gender: true, birthDate: true, avatarUrl: true, isVerified: true, createdAt: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado');
        return user;
    }
    async updateProfile(userId, dto) {
        if (dto.email) {
            const existing = await this.prisma.user.findFirst({
                where: { email: dto.email.toLowerCase().trim(), NOT: { id: userId } },
            });
            if (existing)
                throw new common_1.ConflictException('E-mail já está em uso');
        }
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                ...dto,
                email: dto.email ? dto.email.toLowerCase().trim() : undefined,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            },
            select: {
                id: true, email: true, name: true, phone: true,
                role: true, gender: true, birthDate: true,
            },
        });
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Usuário não encontrado');
        const valid = await bcrypt.compare(dto.currentPassword, user.password);
        if (!valid)
            throw new common_1.UnauthorizedException('Senha atual incorreta');
        const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
        await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
        return { message: 'Senha alterada com sucesso' };
    }
    async updateAvatarUrl(userId, avatarUrl) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: { id: true, avatarUrl: true },
        });
    }
    async removeAvatarUrl(userId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl: null },
            select: { id: true, avatarUrl: true },
        });
    }
    async promoteToProducer(userId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { role: client_1.Role.PRODUCER },
            select: { id: true, email: true, name: true, role: true },
        });
    }
    async promoteToStaff(userId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { role: client_1.Role.STAFF },
            select: { id: true, email: true, name: true, role: true },
        });
    }
    async demoteToCustomer(userId) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { role: client_1.Role.CUSTOMER },
            select: { id: true, email: true, name: true, role: true },
        });
    }
    async listAll(page = 1, limit = 50, search, role) {
        const take = Math.min(limit, 100);
        const skip = (page - 1) * take;
        const roleFilter = role ? { role } : {};
        const searchFilter = search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ],
            }
            : {};
        const where = search && role
            ? { AND: [roleFilter, searchFilter] }
            : { ...roleFilter, ...searchFilter };
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, email: true, name: true, phone: true,
                    role: true, gender: true, birthDate: true,
                    isVerified: true, isActive: true, createdAt: true,
                    _count: { select: { orders: true } },
                },
            }),
            this.prisma.user.count({ where }),
        ]);
        return { data, meta: { total, page, lastPage: Math.ceil(total / take) } };
    }
    async resetUserPassword(userId) {
        const tempPassword = 'Senha@123';
        const hashed = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
        await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
        return { message: `Senha redefinida para: ${tempPassword}` };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map