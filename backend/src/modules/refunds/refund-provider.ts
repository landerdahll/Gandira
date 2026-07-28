export interface RefundRequest {
  orderId: string;
  paymentId: string;
  amountCents: number;
}

export interface RefundResult {
  refundId: string;
  status: 'succeeded' | 'pending';
}

export interface RefundProvider {
  readonly gateway: 'STRIPE' | 'ABACATEPAY';
  refund(request: RefundRequest): Promise<RefundResult>;
}
