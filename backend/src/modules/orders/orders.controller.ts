import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller({ path: 'orders', version: '1' })
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 5 } }) // 5 pedidos/min por usuário
  @ApiOperation({ summary: 'Criar pedido e iniciar pagamento' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: any) {
    return this.orders.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Meus pedidos' })
  findAll(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.orders.findUserOrders(user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do pedido' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.orders.findOne(id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar pedido (CDC: até 7 dias, não antes de 48h do evento)' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('reason') reason?: string,
  ) {
    return this.orders.cancel(id, user.id, reason);
  }
}
