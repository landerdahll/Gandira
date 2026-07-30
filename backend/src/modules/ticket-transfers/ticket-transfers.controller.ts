import { Controller, Get, Post, Body, Param, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestTransferDto } from './dto/request-transfer.dto';
import { TicketTransfersService } from './ticket-transfers.service';

@ApiTags('Ticket transfers') @ApiBearerAuth()
@Controller({ path: 'ticket-transfers', version: '1' })
export class TicketTransfersController {
  constructor(private readonly service: TicketTransfersService) {}

  @Post('tickets/:ticketId') @ApiOperation({ summary: 'Solicitar transferência de ingresso' })
  request(@Param('ticketId') ticketId: string, @Body() dto: RequestTransferDto, @CurrentUser() user: any) {
    return this.service.request(ticketId, user.id, dto.recipientEmail);
  }
  @Get('tickets/:ticketId') @ApiOperation({ summary: 'Situação da transferência do próprio ingresso' })
  status(@Param('ticketId') ticketId: string, @CurrentUser() user: any) { return this.service.ticketStatus(ticketId, user.id); }
  @Post(':id/cancel') @ApiOperation({ summary: 'Cancelar transferência pendente' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) { return this.service.cancel(id, user.id); }
  @Get() @ApiOperation({ summary: 'Listar minhas transferências' })
  mine(@CurrentUser() user: any) { return this.service.mine(user.id); }

  @Get('admin/list') @ApiOperation({ summary: 'Histórico administrativo de transferências' })
  adminList(@Query() query: any, @CurrentUser() user: any, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
    return this.service.adminList({ ...query, page, limit, status: query.status }, user);
  }
  @Get('admin/:id') @ApiOperation({ summary: 'Detalhes e linha do tempo da transferência' })
  adminDetail(@Param('id') id: string, @CurrentUser() user: any) { return this.service.adminDetail(id, user); }
}
