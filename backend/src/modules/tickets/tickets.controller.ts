import { Controller, Get, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller({ path: 'tickets', version: '1' })
export class TicketsController {
  constructor(private tickets: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'Meus ingressos' })
  findAll(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.tickets.findUserTickets(user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do ingresso (inclui QR Code)' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tickets.findOne(id, user.id);
  }
}
