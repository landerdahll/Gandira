import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Batches')
@Controller({ path: 'events/:eventId/batches', version: '1' })
export class BatchesController {
  constructor(private batches: BatchesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lotes do evento' })
  findAll(@Param('eventId') eventId: string) {
    return this.batches.findByEvent(eventId);
  }

  @Post()
  @Roles(Role.PRODUCER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar lote' })
  create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateBatchDto,
    @CurrentUser() user: any,
  ) {
    return this.batches.create(eventId, dto, user.id);
  }

  @Patch(':batchId')
  @Roles(Role.PRODUCER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar quantidade/preço do lote' })
  update(
    @Param('eventId') eventId: string,
    @Param('batchId') batchId: string,
    @Body() dto: UpdateBatchDto,
    @CurrentUser() user: any,
  ) {
    return this.batches.update(eventId, batchId, dto, user.id);
  }
}
