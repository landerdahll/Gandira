import { Controller, Post, Body, Query, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AbacatepayService } from './abacatepay.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class AbacatepayController {
  constructor(private abacatepay: AbacatepayService) {}

  @Post('pix/create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gera cobrança PIX via AbacatePay para um pedido pendente' })
  createPix(@Body('orderId') orderId: string, @CurrentUser() user: any) {
    if (!orderId) throw new BadRequestException('orderId obrigatório');
    return this.abacatepay.createPixCharge(orderId, user.id);
  }

  @Public()
  @SkipThrottle()
  @Post('webhook/abacatepay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook AbacatePay (interno)' })
  async abacatepayWebhook(
    @Body() body: any,
    @Query('secret') secret: string,
  ) {
    await this.abacatepay.handleWebhook(body, secret ?? '');
    return { received: true };
  }
}
