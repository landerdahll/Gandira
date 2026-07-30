import { EmailOutboxService } from './email-outbox.service';

describe('EmailOutboxService', () => {
  function setup(deliver = jest.fn().mockResolvedValue({ providerMessageId: 'resend-1' })) {
    const item: any = { id: 'mail-1', type: 'ORDER_CONFIRMATION', recipient: 'buyer@example.com', template: 'TRANSFER', payload: { subject: 'Teste', message: 'Mensagem' }, status: 'PENDING', attempts: 1, maxAttempts: 3, nextAttemptAt: new Date() };
    const prisma: any = { emailOutbox: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue(item),
      update: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), upsert: jest.fn().mockResolvedValue(item),
    } };
    const mail: any = { deliver, render: jest.fn().mockReturnValue({ subject: 'Teste' }) };
    const config: any = { get: (_key: string, fallback: unknown) => fallback };
    const tokens: any = { reconstruct: jest.fn().mockReturnValue('public-token') };
    return { service: new EmailOutboxService(prisma, mail, config, tokens), prisma, deliver };
  }

  it('marca SENT e persiste o ID do Resend após claim', async () => {
    const { service, prisma } = setup();
    await (service as any).processOne('mail-1');
    expect(prisma.emailOutbox.updateMany).toHaveBeenCalled();
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'SENT', providerMessageId: 'resend-1' }) }));
  });

  it('agenda RETRY sem propagar falha para a operação de negócio', async () => {
    const { service, prisma } = setup(jest.fn().mockRejectedValue(new Error('provider unavailable')));
    await expect((service as any).processOne('mail-1')).resolves.toBeUndefined();
    expect(prisma.emailOutbox.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'RETRY' }) }));
  });

  it('não envia quando outro processo venceu o claim', async () => {
    const { service, prisma, deliver } = setup();
    prisma.emailOutbox.updateMany.mockResolvedValueOnce({ count: 0 });
    await (service as any).processOne('mail-1');
    expect(deliver).not.toHaveBeenCalled();
  });
});
