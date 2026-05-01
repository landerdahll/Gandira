import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { IsOptional, IsString, IsEnum, IsDateString, MaxLength, IsEmail, MinLength, Matches } from 'class-validator';
import { Gender, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsDateString() birthDate?: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) @Matches(/[A-Z]/, { message: 'Deve ter ao menos 1 letra maiúscula' }) @Matches(/\d/, { message: 'Deve ter ao menos 1 número' }) newPassword: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true,
        role: true, gender: true, birthDate: true, avatarUrl: true, isVerified: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: dto.email.toLowerCase().trim(), NOT: { id: userId } },
      });
      if (existing) throw new ConflictException('E-mail já está em uso');
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

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Senha atual incorreta');

    const hashed = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });

    return { message: 'Senha alterada com sucesso' };
  }

  async updateAvatarUrl(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  }

  async removeAvatarUrl(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: { id: true, avatarUrl: true },
    });
  }

  async promoteToProducer(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.PRODUCER },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async promoteToStaff(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.STAFF },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async demoteToCustomer(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: Role.CUSTOMER },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  async listAll(page = 1, limit = 50, search?: string, role?: Role) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;

    const roleFilter = role ? { role } : {};
    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
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

  async resetUserPassword(userId: string) {
    const tempPassword = 'Senha@123';
    const hashed = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { message: `Senha redefinida para: ${tempPassword}` };
  }
}
