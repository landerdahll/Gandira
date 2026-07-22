export type CheckoutDiscountType = 'NONE' | 'COUPON' | 'CLUB';

export function getDiscountLabel(discountType?: CheckoutDiscountType) {
  if (discountType === 'CLUB') return 'Benefício Clube Outrahora';
  if (discountType === 'COUPON') return 'Desconto (cupom)';
  return 'Desconto';
}

export function canTransferTicket(ticket?: { clubBenefitApplied?: boolean } | null) {
  return ticket?.clubBenefitApplied !== true;
}
