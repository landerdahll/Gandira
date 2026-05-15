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

  @Post('pix/check')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consulta status do PIX no AbacatePay e confirma pedido se pago' })
  checkPix(
    @Body('pixId') pixId: string,
    @Body('orderId') orderId: string,
    @CurrentUser() user: any,
  ) {
    if (!pixId || !orderId) throw new BadRequestException('pixId e orderId obrigatórios');
    return this.abacatepay.checkPixAndConfirm(pixId, orderId, user.id);
  }

  @Post('pix/simulate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Simula pagamento PIX em modo dev (AbacatePay sandbox)' })
  simulatePix(@Body('pixId') pixId: string, @CurrentUser() _user: any) {
    if (!pixId) throw new BadRequestException('pixId obrigatório');
    return this.abacatepay.simulatePixPayment(pixId);
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
