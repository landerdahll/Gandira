import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RefundProvider, RefundRequest, RefundResult } from './refund-provider';

@Injectable()
export class AbacateRefundProvider implements RefundProvider {
  readonly gateway = 'ABACATEPAY' as const;
  private readonly apiKey: string;
  constructor(config: ConfigService) { this.apiKey = config.getOrThrow<string>('ABACATEPAY_API_KEY'); }

  async refund(request: RefundRequest): Promise<RefundResult> {
    const response = await fetch('https://api.abacatepay.com/v2/payment-links/refund', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: request.paymentId, reason: `Pedido ${request.orderId} cancelado pelo cliente.` }),
    });
    const body: any = await response.json().catch(() => null);
    if (!response.ok || !body?.success || !body?.data?.refundPublicId) {
      throw new BadGatewayException(`AbacatePay recusou o reembolso: ${body?.error ?? response.status}`);
    }
    return { refundId: body.data.refundPublicId, status: 'succeeded' };
  }
}
