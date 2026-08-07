import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { SetEventFeaturedDto } from './dto/set-event-featured.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { SelectedOrganization } from '../../common/decorators/selected-organization.decorator';

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

@ApiTags('Events')
@Controller({ path: 'events', version: '1' })
export class EventsController {
  constructor(private events: EventsService, private cloudinary: CloudinaryService) {}

  // ── Public ─────────────────────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'Listar eventos publicados' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'past', required: false, type: Boolean })
  findAll(
    @Query('city') city?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('past') past?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.events.findAll({ city, category, search, page, limit, past: past === 'true' });
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Evento em destaque da Home' })
  featured() {
    return this.events.findFeatured();
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todos os eventos para o Painel Master' })
  adminList(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.events.findAdminEvents({ search, page, limit });
  }

  @Patch('admin/:id/featured')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Definir evento como destaque da Home' })
  setFeatured(@Param('id') id: string, @Body() dto: SetEventFeaturedDto) {
    return this.events.setFeatured(id, dto.featured);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Detalhes do evento por slug' })
  findOne(@Param('slug') slug: string) {
    return this.events.findBySlug(slug);
  }

  // ── Producer ───────────────────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar evento' })
  create(@Body() dto: CreateEventDto, @CurrentUser() user: any, @SelectedOrganization() organizationId?: string) {
    return this.events.create(dto, user, organizationId);
  }

  @Post('upload-image')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload de imagem para evento (máx. 5 MB)' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: IMAGE_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMES.includes(file.mimetype)) {
          return cb(new BadRequestException('Formato inválido. Use JPG, PNG ou WebP.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any, @SelectedOrganization() organizationId?: string) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    await this.events.authorizeUpload(user, organizationId);
    const result = await this.cloudinary.uploadBuffer(file.buffer, file.mimetype, 'outrahora/events');
    return { url: result.secure_url };
  }

  @Get(':id/manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar evento por ID (edição)' })
  findForEdit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.events.findByIdForProducer(id, user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar evento' })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() user: any) {
    return this.events.update(id, user, dto);
  }

  @Get('producer/my-events')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Meus eventos (produtor)' })
  myEvents(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @SelectedOrganization() organizationId?: string,
  ) {
    return this.events.findProducerEvents(user, page, limit, organizationId);
  }

  @Patch(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publicar evento' })
  publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.events.publish(id, user);
  }

  @Patch(':id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar evento (cancela ingressos e triggers reembolso)' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.events.cancel(id, user);
  }
}
