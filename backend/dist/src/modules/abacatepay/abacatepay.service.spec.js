"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const abacatepay_service_1 = require("./abacatepay.service");
describe('AbacatepayService fulfillment integration', () => {
    const originalFetch = global.fetch;
    function setup(orderOverrides = {}) {
        const order = {
            id: 'order-1', userId: 'user-1', status: 'PENDING', total: 100,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000), event: { title: 'Evento' },
            ...orderOverrides,
        };
        const config = { get: jest.fn((key, fallback) => fallback ?? `${key}_value`) };
        const prisma = { order: { findUnique: jest.fn().mockResolvedValue(order) } };
        const fulfillment = { confirmPaidOrder: jest.fn().mockResolvedValue({ status: 'FULFILLED', orderStatus: 'PAID' }) };
        return { service: new abacatepay_service_1.AbacatepayService(config, prisma, fulfillment), fulfillment };
    }
    afterEach(() => { global.fetch = originalFetch; });
    it('envia expiresIn restante e retorna Order.expiresAt como autoridade', async () => {
        const { service } = setup();
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ data: { id: 'pix_1', brCode: 'code', brCodeBase64: 'image', expiresAt: '2099-01-01' } }),
        });
        const result = await service.createPixCharge('order-1', 'user-1');
        const request = global.fetch.mock.calls[0][1];
        const body = JSON.parse(request.body);
        expect(body.data.expiresIn).toBeGreaterThanOrEqual(3599);
        expect(body.data.expiresIn).toBeLessThanOrEqual(3600);
        expect(result.expiresAt).toBeInstanceOf(Date);
        expect(result.expiresAt.toISOString()).not.toBe('2099-01-01T00:00:00.000Z');
    });
    it('não chama a AbacatePay para pedido expirado', async () => {
        const { service } = setup({ expiresAt: new Date(Date.now() - 1) });
        global.fetch = jest.fn();
        await expect(service.createPixCharge('order-1', 'user-1')).rejects.toBeInstanceOf(common_1.BadRequestException);
        expect(global.fetch).not.toHaveBeenCalled();
    });
    it('delega PIX pago ao finalizador sem usar campos Stripe', async () => {
        const { service, fulfillment } = setup();
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { status: 'PAID' } }) });
        await service.checkPixAndConfirm('pix_1', 'order-1', 'user-1');
        expect(fulfillment.confirmPaidOrder).toHaveBeenCalledWith({
            orderId: 'order-1', gateway: 'ABACATEPAY', externalPaymentId: 'pix_1',
        });
    });
    it('webhook tardio é reconhecido sem lançar e sem solicitar retry', async () => {
        const { service, fulfillment } = setup();
        fulfillment.confirmPaidOrder.mockResolvedValue({ status: 'LATE_PAYMENT_REQUIRES_REVIEW', orderStatus: 'EXPIRED' });
        await expect(service.handleWebhook({
            event: 'transparent.completed', data: { externalId: 'order-1', id: 'pix_late' },
        }, 'ABACATEPAY_WEBHOOK_SECRET_value')).resolves.toBeUndefined();
    });
});
//# sourceMappingURL=abacatepay.service.spec.js.map