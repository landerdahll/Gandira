"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const payment_expiration_util_1 = require("./payment-expiration.util");
describe('calculateRemainingPaymentSeconds', () => {
    const now = new Date('2026-07-22T12:00:00.000Z');
    it('calcula segundos restantes a partir de Order.expiresAt', () => {
        expect((0, payment_expiration_util_1.calculateRemainingPaymentSeconds)(new Date(now.getTime() + 60 * 60 * 1000), now)).toBe(3600);
    });
    it('usa o mínimo seguro quando restam poucos segundos', () => {
        expect((0, payment_expiration_util_1.calculateRemainingPaymentSeconds)(new Date(now.getTime() + 1200), now)).toBe(10);
    });
    it('não permite cobrança para pedido expirado', () => {
        expect(() => (0, payment_expiration_util_1.calculateRemainingPaymentSeconds)(now, now)).toThrow(common_1.BadRequestException);
    });
});
//# sourceMappingURL=payment-expiration.util.spec.js.map