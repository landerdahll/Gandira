import { MailService } from './mail.service';

describe('MailService', () => {
  function setup() {
    const values: Record<string, string> = {
      RESEND_API_KEY: 're_test', RESEND_FROM_EMAIL: 'noreply@outrahora.com',
      RESEND_FROM_NAME: 'Pago by OutraHora', FRONTEND_URL: 'https://pago.outrahora.com', NODE_ENV: 'test',
    };
    const config: any = { get: (key: string, fallback?: string) => values[key] ?? fallback };
    const service = new MailService(config);
    const send = jest.fn().mockResolvedValue({ data: { id: 'resend-1' }, error: null });
    (service as any).resend = { emails: { send } };
    return { service, send };
  }

  it('envia attachment e idempotency key ao Resend', async () => {
    const { service, send } = setup();
    const attachment = { filename: 'ingressos.pdf', content: Buffer.from('%PDF'), contentType: 'application/pdf' };
    await expect(service.deliver('buyer@example.com', 'ORDER_CONFIRMATION', {
      name: 'Buyer', eventTitle: 'Evento', eventDate: new Date().toISOString(), items: [], total: 10,
      orderId: 'order-1', myTicketsUrl: 'https://pago.outrahora.com/my-tickets', venue: 'Casa',
    }, { attachments: [attachment], idempotencyKey: 'email-outbox-item-1' })).resolves.toEqual({ providerMessageId: 'resend-1' });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ attachments: [attachment] }), { idempotencyKey: 'email-outbox-item-1' });
  });

  it('não inclui attachments nos demais e-mails', async () => {
    const { service, send } = setup();
    await service.deliver('buyer@example.com', 'EMAIL_VERIFICATION', { name: 'Buyer', url: 'https://pago.outrahora.com/verify' });
    expect(send.mock.calls[0][0]).not.toHaveProperty('attachments');
  });

  it('identifica claramente erros do Resend', async () => {
    const { service, send } = setup();
    send.mockResolvedValue({ data: null, error: { message: 'domain rejected' } });
    await expect(service.deliver('buyer@example.com', 'TRANSFER', { message: 'Teste' })).rejects.toThrow('[RESEND] domain rejected');
  });
});
