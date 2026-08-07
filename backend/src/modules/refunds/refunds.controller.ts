import { Body, Controller, DefaultValuePipe, Get, Ip, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, Equals } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RefundsService } from './refunds.service';
import { SelectedOrganization } from '../../common/decorators/selected-organization.decorator';
class CancelOrderDto { @IsBoolean() @Equals(true) acceptedPolicy!: boolean; }
@ApiTags('Refunds') @ApiBearerAuth() @Controller({ path: 'refunds', version: '1' })
export class RefundsController {
  constructor(private refunds: RefundsService) {}
  @Post('orders/:id') @ApiOperation({ summary: 'Cancelar pedido e solicitar reembolso integral' })
  cancel(@Param('id') id: string, @Body() dto: CancelOrderDto, @CurrentUser() user: any, @Ip() ip: string) { return this.refunds.cancel(id, user.id, dto.acceptedPolicy, ip); }
  @Get('admin') @ApiOperation({ summary: 'Histórico administrativo de cancelamentos' })
  list(@CurrentUser() user: any, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number, @SelectedOrganization() organizationId?: string) { return this.refunds.adminList(user, page, limit, organizationId); }
}
