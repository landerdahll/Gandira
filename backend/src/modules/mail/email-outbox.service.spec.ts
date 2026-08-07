import { EmailOutboxService } from './email-outbox.service';

describe('EmailOutboxService', () => {
  function setup(deliver = jest.fn().mockResolvedValue({ providerMessageId: 'resend-1' })) {
    const item: any = { id: 'mail-1', type: 'ORDER_CONFIRMATION', recipient: 'buyer@example.com', template: 'TRANSFER', payload: { subject: 'Teste', message: 'Mensagem', orderId: 'order-1' }, relatedEntityId: 'order-1', status: 'PENDING', attempts: 1, maxAttempts: 3, nextAttemptAt: new Date() };
    const prisma: any = { emailOutbox: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue(item),
      update: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), upsert: jest.fn().mockResolvedValue(item),
    } };
    const mail: any = { deliver, render: jest.fn().mockReturnValue({ subject: 'Teste' }) };
    const config: any = { get: (_key: string, fallback: unknown) => fallback };
    const tokens: any = { reconstruct: jest.fn().mockReturnValue('public-token') };
    const ticketPdf: any = { createForOrder: jest.fn().mockResolvedValue({ attachment: { filename: 'tickets.pdf', content: Buffer.from('pdf'), contentType: 'application/pdf' }, eligibleCount: 1 }) };
    return { service: new EmailOutboxService(prisma, mail, config, tokens, ticketPdf), prisma, deliver, ticketPdf };
  }

  it('marca SENT e persiste o ID do Resend após claim', async () => {
    const { service, prisma, deliver } = setup();
    await (service as any).processOne('mail-1');
    expect(prisma.emailOutbox.updateMany).toHaveBeenCalled();
    expect(deliver).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.objectContaining({
      attachments: [expect.objectContaining({ filename: 'tickets.pdf' })], idempotencyKey: 'email-outbox-mail-1',
    }));
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SENT', providerMessageId: 'resend-1' }) }));
  });

  it('envia confirmação sem anexo quando nenhum ingresso está elegível', async () => {
    const { service, deliver, ticketPdf } = setup();
    ticketPdf.createForOrder.mockResolvedValue({ attachment: null, eligibleCount: 0 });
    await (service as any).processOne('mail-1');
    expect(deliver).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.objectContaining({ attachments: undefined }));
  });

  it('agenda RETRY sem propagar falha para a operação de negócio', async () => {
    const { service, prisma } = setup(jest.fn().mockRejectedValue(new Error('provider unavailable')));
    await expect((service as any).processOne('mail-1')).resolves.toBeUndefined();
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'RETRY' }) }));
  });

  it('persiste erro de geração do PDF com categoria própria', async () => {
    const { service, prisma, ticketPdf, deliver } = setup();
    ticketPdf.createForOrder.mockRejectedValue(new Error('[PDF_GENERATION] pedido=order-1: inválido'));
    await (service as any).processOne('mail-1');
    expect(deliver).not.toHaveBeenCalled();
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastError: expect.stringContaining('[PDF_GENERATION]') }) }));
  });

  it('persiste erro do Resend separadamente do erro de PDF', async () => {
    const { service, prisma } = setup(jest.fn().mockRejectedValue(new Error('[RESEND] provider unavailable')));
    await (service as any).processOne('mail-1');
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastError: '[RESEND] provider unavailable' }) }));
  });

  it('não envia quando outro processo venceu o claim', async () => {
    const { service, prisma, deliver } = setup();
    prisma.emailOutbox.updateMany.mockResolvedValueOnce({ count: 0 });
    await (service as any).processOne('mail-1');
    expect(deliver).not.toHaveBeenCalled();
  });
});
