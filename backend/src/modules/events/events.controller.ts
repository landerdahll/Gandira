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
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

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
  @Get(':slug')
  @ApiOperation({ summary: 'Detalhes do evento por slug' })
  findOne(@Param('slug') slug: string) {
    return this.events.findBySlug(slug);
  }

  // ── Producer ───────────────────────────────────────────────────────────────

  @Post()
  @Roles(Role.PRODUCER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar evento' })
  create(@Body() dto: CreateEventDto, @CurrentUser() user: any) {
    return this.events.create(dto, user.id);
  }

  @Post('upload-image')
  @Roles(Role.PRODUCER, Role.ADMIN)
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
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado');
    const result = await this.cloudinary.uploadBuffer(file.buffer, file.mimetype, 'outrahora/events');
    return { url: result.secure_url };
  }

  @Get(':id/manage')
  @Roles(Role.PRODUCER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar evento por ID (edição)' })
  findForEdit(@Param('id') id: string, @CurrentUser() user: any) {
    return this.events.findByIdForProducer(id, user.id);
  }

  @Patch(':id')
  @Roles(Role.PRODUCER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar evento' })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto, @CurrentUser() user: any) {
    return this.events.update(id, user.id, dto);
  }

  @Get('producer/my-events')
  @Roles(Role.PRODUCER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Meus eventos (produtor)' })
  myEvents(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.events.findProducerEvents(user.id, page, limit);
  }

  @Patch(':id/publish')
  @Roles(Role.PRODUCER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publicar evento' })
  publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.events.publish(id, user.id);
  }

  @Patch(':id/cancel')
  @Roles(Role.PRODUCER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar evento (cancela ingressos e triggers reembolso)' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.events.cancel(id, user.id);
  }
}
