import { BadRequestException } from '@nestjs/common';
import { calculateRemainingPaymentSeconds } from './payment-expiration.util';

describe('calculateRemainingPaymentSeconds', () => {
  const now = new Date('2026-07-22T12:00:00.000Z');

  it('calcula segundos restantes a partir de Order.expiresAt', () => {
    expect(calculateRemainingPaymentSeconds(new Date(now.getTime() + 60 * 60 * 1000), now)).toBe(3600);
  });

  it('usa o mínimo seguro quando restam poucos segundos', () => {
    expect(calculateRemainingPaymentSeconds(new Date(now.getTime() + 1200), now)).toBe(10);
  });

  it('não permite cobrança para pedido expirado', () => {
    expect(() => calculateRemainingPaymentSeconds(now, now)).toThrow(BadRequestException);
  });
});
