"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_STRIPE_PIX_EXPIRATION_SECONDS = exports.MIN_PAYMENT_EXPIRATION_SECONDS = void 0;
exports.calculateRemainingPaymentSeconds = calculateRemainingPaymentSeconds;
const common_1 = require("@nestjs/common");
exports.MIN_PAYMENT_EXPIRATION_SECONDS = 10;
exports.MAX_STRIPE_PIX_EXPIRATION_SECONDS = 1_209_600;
function calculateRemainingPaymentSeconds(expiresAt, now = new Date()) {
    const remainingMilliseconds = expiresAt.getTime() - now.getTime();
    if (remainingMilliseconds <= 0) {
        throw new common_1.BadRequestException('Pedido expirado. Não é possível criar uma nova cobrança.');
    }
    const remainingSeconds = Math.ceil(remainingMilliseconds / 1000);
    return Math.min(exports.MAX_STRIPE_PIX_EXPIRATION_SECONDS, Math.max(exports.MIN_PAYMENT_EXPIRATION_SECONDS, remainingSeconds));
}
//# sourceMappingURL=payment-expiration.util.js.map