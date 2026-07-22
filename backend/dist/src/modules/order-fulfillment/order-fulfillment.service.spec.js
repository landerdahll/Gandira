"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const order_fulfillment_service_1 = require("./order-fulfillment.service");
describe('OrderFulfillmentService', () => {
    const future = new Date(Date.now() + 60_000);
    const baseOrder = {
        id: 'order-1', eventId: 'event-1', status: 'PENDING', expiresAt: future,
        items: [{ batchId: 'batch-1', quantity: 2 }],
    };
    function setup(order = baseOrder) {
        const tx = {
            order: {
                findUnique: jest.fn().mockResolvedValue(order),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
        };
        const fullOrder = {
            id: 'order-1', total: 100,
            user: { email: 'buyer@example.com', name: 'Buyer' },
            event: { title: 'Evento', startDate: new Date(), venue: 'Local', city: 'Cidade' },
            items: [{ quantity: 2, batch: { name: 'Lote', ticketType: 'GENERAL' } }],
            tickets: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
        };
        const prisma = {
            $transaction: jest.fn((callback) => callback(tx)),
            order: { findUnique: jest.fn().mockResolvedValue(fullOrder) },
        };
        const tickets = { generateTicket: jest.fn().mockResolvedValue({}) };
        const mail = { sendOrderConfirmation: jest.fn().mockResolvedValue(undefined) };
        const config = { get: jest.fn((_key, fallback) => fallback) };
        const expiration = { expirePendingOrderInTransaction: jest.fn().mockResolvedValue('EXPIRED') };
        return {
            service: new order_fulfillment_service_1.OrderFulfillmentService(prisma, tickets, mail, config, expiration),
            tx, prisma, tickets, mail, expiration,
        };
    }
    it('faz claim, gera todos os tickets e envia e-mail após o commit', async () => {
        const { service, tx, prisma, tickets, mail } = setup();
        const result = await service.confirmPaidOrder({
            orderId: 'order-1', gateway: 'STRIPE', externalPaymentId: 'pi_1', stripeChargeId: 'ch_1',
        });
        expect(result.status).toBe('FULFILLED');
        expect(tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            data: { status: 'PAID', stripeChargeId: 'ch_1' },
        }));
        expect(tickets.generateTicket).toHaveBeenCalledTimes(2);
        expect(prisma.$transaction.mock.invocationCallOrder[0]).toBeLessThan(mail.sendOrderConfirmation.mock.invocationCallOrder[0]);
    });
    it('não grava identificador AbacatePay em campo Stripe', async () => {
        const { service, tx } = setup();
        await service.confirmPaidOrder({ orderId: 'order-1', gateway: 'ABACATEPAY', externalPaymentId: 'pix_1' });
        expect(tx.order.updateMany.mock.calls[0][0].data).toEqual({ status: 'PAID' });
    });
    it('é idempotente para pedido já pago e não reenvia e-mail', async () => {
        const { service, tickets, mail } = setup({ ...baseOrder, status: 'PAID' });
        await expect(service.confirmPaidOrder({ orderId: 'order-1', gateway: 'STRIPE' }))
            .resolves.toEqual({ status: 'ALREADY_PAID', orderStatus: 'PAID' });
        expect(tickets.generateTicket).not.toHaveBeenCalled();
        expect(mail.sendOrderConfirmation).not.toHaveBeenCalled();
    });
    it('não duplica tickets quando outra confirmação vence o claim', async () => {
        const { service, tx, tickets, mail } = setup();
        tx.order.updateMany.mockResolvedValue({ count: 0 });
        tx.order.findUnique
            .mockResolvedValueOnce(baseOrder)
            .mockResolvedValueOnce({ status: 'PAID' });
        await expect(service.confirmPaidOrder({ orderId: 'order-1', gateway: 'ABACATEPAY' }))
            .resolves.toEqual({ status: 'ALREADY_PAID', orderStatus: 'PAID' });
        expect(tickets.generateTicket).not.toHaveBeenCalled();
        expect(mail.sendOrderConfirmation).not.toHaveBeenCalled();
    });
    it.each(['CANCELLED', 'REFUNDED'])('não permite pedido %s virar PAID', async (status) => {
        const { service, tx, tickets } = setup({ ...baseOrder, status });
        await expect(service.confirmPaidOrder({ orderId: 'order-1', gateway: 'STRIPE' }))
            .resolves.toEqual({ status: 'ORDER_NOT_PAYABLE', orderStatus: status });
        expect(tx.order.updateMany).not.toHaveBeenCalled();
        expect(tickets.generateTicket).not.toHaveBeenCalled();
    });
    it('reutiliza a expiração compartilhada para pagamento tardio', async () => {
        const { service, expiration, tickets } = setup({ ...baseOrder, expiresAt: new Date(Date.now() - 1000) });
        await expect(service.confirmPaidOrder({ orderId: 'order-1', gateway: 'ABACATEPAY', externalPaymentId: 'pix_late' }))
            .resolves.toEqual({ status: 'LATE_PAYMENT_REQUIRES_REVIEW', orderStatus: 'EXPIRED' });
        expect(expiration.expirePendingOrderInTransaction).toHaveBeenCalled();
        expect(tickets.generateTicket).not.toHaveBeenCalled();
    });
    it('faz rollback lógico quando a geração de ticket falha e não envia e-mail', async () => {
        const { service, tickets, mail } = setup();
        tickets.generateTicket.mockRejectedValue(new Error('ticket failed'));
        await expect(service.confirmPaidOrder({ orderId: 'order-1', gateway: 'STRIPE' })).rejects.toThrow('ticket failed');
        expect(mail.sendOrderConfirmation).not.toHaveBeenCalled();
    });
    it('trata falha de e-mail após commit como best effort', async () => {
        const { service, mail } = setup();
        mail.sendOrderConfirmation.mockRejectedValue(new Error('mail unavailable'));
        await expect(service.confirmPaidOrder({ orderId: 'order-1', gateway: 'STRIPE' }))
            .resolves.toEqual({ status: 'FULFILLED', orderStatus: 'PAID' });
    });
});
//# sourceMappingURL=order-fulfillment.service.spec.js.map