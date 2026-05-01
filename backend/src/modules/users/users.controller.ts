import { Controller, Get, Patch, Post, Delete, Body, Param, Query, ParseIntPipe, DefaultValuePipe, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { UsersService, UpdateProfileDto, ChangePasswordDto } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

const AVATAR_MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private users: UsersService, private cloudinary: CloudinaryService) {}

  @Get('me')
  @ApiOperation({ summary: 'Meu perfil' })
  me(@CurrentUser() user: any) {
    return this.users.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualizar perfil' })
  update(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Alterar senha' })
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.id, dto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload de foto de perfil (máx. 3 MB)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: AVATAR_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
          return cb(new BadRequestException('Formato inválido. Use JPG, PNG ou WebP.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    const result = await this.cloudinary.uploadBuffer(file.buffer, file.mimetype, 'outrahora/avatars');
    return this.users.updateAvatarUrl(user.id, result.secure_url);
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Remover foto de perfil' })
  removeAvatar(@CurrentUser() user: any) {
    return this.users.removeAvatarUrl(user.id);
  }

  @Patch(':id/promote-producer')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Promover usuário a produtor (admin)' })
  promote(@Param('id') id: string) {
    return this.users.promoteToProducer(id);
  }

  @Patch(':id/promote-staff')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Promover usuário a staff (admin)' })
  promoteStaff(@Param('id') id: string) {
    return this.users.promoteToStaff(id);
  }

  @Patch(':id/demote')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Revogar cargo — volta a Cliente (admin)' })
  demote(@Param('id') id: string) {
    return this.users.demoteToCustomer(id);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar todos os usuários (admin)' })
  listAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ) {
    return this.users.listAll(page, limit, search, role);
  }

  @Patch(':id/reset-password')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Redefinir senha de usuário (admin)' })
  resetPassword(@Param('id') id: string) {
    return this.users.resetUserPassword(id);
  }
}
