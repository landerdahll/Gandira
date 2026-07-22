"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const payments_service_1 = require("./payments.service");
describe('PaymentsService fulfillment integration', () => {
    function setup() {
        const config = { get: jest.fn((key) => key === 'STRIPE_SECRET_KEY' ? 'sk_test_fake' : '') };
        const prisma = {
            order: { findUnique: jest.fn().mockResolvedValue({ id: 'order-1' }) },
            $transaction: jest.fn((callback) => callback({ order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) } })),
        };
        const fulfillment = { confirmPaidOrder: jest.fn().mockResolvedValue({ status: 'FULFILLED', orderStatus: 'PAID' }) };
        const expiration = { cancelPendingOrder: jest.fn().mockResolvedValue(true) };
        const clubBenefits = { releaseConfirmedForOrderInTransaction: jest.fn() };
        const service = new payments_service_1.PaymentsService(config, prisma, fulfillment, expiration, clubBenefits);
        const stripe = {
            paymentIntents: {
                create: jest.fn().mockResolvedValue({ id: 'pi_1', client_secret: 'secret' }),
            },
        };
        service.stripe = stripe;
        return { service, prisma, fulfillment, stripe, expiration, clubBenefits };
    }
    it('configura a validade PIX com os segundos restantes do pedido', async () => {
        const { service, stripe } = setup();
        await service.createPaymentIntent({
            id: 'order-1', eventId: 'event-1', total: 100,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), event: { title: 'Evento' },
        });
        const params = stripe.paymentIntents.create.mock.calls[0][0];
        expect(params.amount).toBe(10000);
        expect(params.payment_method_options.pix.expires_after_seconds).toBeGreaterThanOrEqual(3599);
        expect(params.payment_method_options.pix.expires_after_seconds).toBeLessThanOrEqual(3600);
    });
    it('não cria PaymentIntent para pedido expirado', async () => {
        const { service, stripe } = setup();
        await expect(service.createPaymentIntent({
            id: 'order-1', eventId: 'event-1', total: 100, expiresAt: new Date(Date.now() - 1),
        })).rejects.toBeInstanceOf(common_1.BadRequestException);
        expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    });
    it('delega payment_intent.succeeded ao finalizador compartilhado', async () => {
        const { service, fulfillment } = setup();
        await service.handleWebhookEvent({
            type: 'payment_intent.succeeded',
            data: { object: { id: 'pi_1', latest_charge: 'ch_1' } },
        });
        expect(fulfillment.confirmPaidOrder).toHaveBeenCalledWith({
            orderId: 'order-1', gateway: 'STRIPE', externalPaymentId: 'pi_1', stripeChargeId: 'ch_1',
        });
    });
    it('reconhece pagamento tardio no webhook sem lançar erro', async () => {
        const { service, fulfillment } = setup();
        fulfillment.confirmPaidOrder.mockResolvedValue({ status: 'LATE_PAYMENT_REQUIRES_REVIEW', orderStatus: 'EXPIRED' });
        await expect(service.handleWebhookEvent({
            type: 'payment_intent.succeeded', data: { object: { id: 'pi_late', latest_charge: 'ch_late' } },
        })).resolves.toBeUndefined();
    });
    it('libera o benefício somente quando o webhook confirma reembolso integral', async () => {
        const { service, clubBenefits } = setup();
        await service.handleWebhookEvent({
            type: 'charge.refunded',
            data: { object: { id: 'ch_1', amount: 10000, amount_refunded: 5000, payment_intent: 'pi_1' } },
        });
        expect(clubBenefits.releaseConfirmedForOrderInTransaction).not.toHaveBeenCalled();
        await service.handleWebhookEvent({
            type: 'charge.refunded',
            data: { object: { id: 'ch_1', amount: 10000, amount_refunded: 10000, payment_intent: 'pi_1', refunds: { data: [{ id: 're_1' }] } } },
        });
        expect(clubBenefits.releaseConfirmedForOrderInTransaction).toHaveBeenCalledWith(expect.anything(), 'order-1', 'FULL_REFUND_CONFIRMED', expect.any(Date));
    });
});
//# sourceMappingURL=payments.service.spec.js.map