import { BadRequestException } from '@nestjs/common';

export const MIN_PAYMENT_EXPIRATION_SECONDS = 10;
export const MAX_STRIPE_PIX_EXPIRATION_SECONDS = 1_209_600;

export function calculateRemainingPaymentSeconds(expiresAt: Date, now = new Date()): number {
  const remainingMilliseconds = expiresAt.getTime() - now.getTime();
  if (remainingMilliseconds <= 0) {
    throw new BadRequestException('Pedido expirado. Não é possível criar uma nova cobrança.');
  }
  const remainingSeconds = Math.ceil(remainingMilliseconds / 1000);
  return Math.min(
    MAX_STRIPE_PIX_EXPIRATION_SECONDS,
    Math.max(MIN_PAYMENT_EXPIRATION_SECONDS, remainingSeconds),
  );
}
