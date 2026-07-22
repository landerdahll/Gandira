export declare const MIN_PAYMENT_EXPIRATION_SECONDS = 10;
export declare const MAX_STRIPE_PIX_EXPIRATION_SECONDS = 1209600;
export declare function calculateRemainingPaymentSeconds(expiresAt: Date, now?: Date): number;
