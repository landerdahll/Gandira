import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private payments: PaymentsService) {}

  /**
   * Stripe webhook endpoint.
   * MUST be @Public (no JWT) — Stripe doesn't send auth tokens.
   * Security comes from signature verification with STRIPE_WEBHOOK_SECRET.
   * rawBody must be enabled in main.ts for Stripe to verify correctly.
   */
  @Post('confirm-order')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirma pedido verificando Stripe diretamente (fallback para webhook)' })
  confirmOrder(@Body('orderId') orderId: string, @CurrentUser() user: any) {
    if (!orderId) throw new BadRequestException('orderId obrigatório');
    return this.payments.confirmOrder(orderId, user.id);
  }

  @Public()
  @SkipThrottle()
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook (interno — não chamar diretamente)' })
  async stripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing Stripe signature');

    const rawBody = (req as any).rawBody;
    if (!rawBody) throw new BadRequestException('Raw body not available');

    const event = this.payments.constructWebhookEvent(rawBody, signature);
    await this.payments.handleWebhookEvent(event);

    return { received: true };
  }
}
