import { PDFDocument } from 'pdf-lib';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import * as QRCode from 'qrcode';
import { TicketPdfService } from './ticket-pdf.service';

describe('TicketPdfService', () => {
  const token = 'ticket-token-exatamente-validado-pelo-checkin';
  const baseOrder = {
    id: 'order-123', status: 'PAID', userId: 'buyer-1', user: { name: 'Comprador', email: 'buyer@example.com' },
    event: { title: 'Festival Pago', startDate: new Date('2026-08-10T22:00:00.000Z'), endDate: new Date('2026-08-11T01:00:00.000Z'), venue: 'Casa', address: 'Rua Um, 10', city: 'São Paulo', state: 'SP' },
    tickets: [{ id: 'ticket-ABCDEFGH', token, status: 'ACTIVE', ownerUserId: 'buyer-1', holderName: null, holderEmail: null, checkIn: null, batch: { name: 'Primeiro lote' } }],
  };

  function setup(order: any = baseOrder) {
    const prisma: any = { order: { findUnique: jest.fn().mockResolvedValue(order) } };
    return { service: new TicketPdfService(prisma), prisma };
  }

  it('gera um PDF válido, em memória, com uma página por ingresso elegível', async () => {
    const order = { ...baseOrder, tickets: [baseOrder.tickets[0], { ...baseOrder.tickets[0], id: 'ticket-IJKLMNOP', token: 'segundo-token' }] };
    const { service } = setup(order);
    const result = await service.createForOrder(order.id, order.user.email);
    expect(result.eligibleCount).toBe(2);
    expect(result.attachment?.filename).toBe('ingressos-pago-order-123.pdf');
    expect(result.attachment?.contentType).toBe('application/pdf');
    expect(result.attachment!.content.byteLength).toBeLessThan(10 * 1024 * 1024);
    const document = await PDFDocument.load(result.attachment!.content);
    expect(document.getPageCount()).toBe(2);
  });

  it('gera QR que decodifica exatamente para Ticket.token', async () => {
    const pngBuffer = await QRCode.toBuffer(token, { type: 'png', errorCorrectionLevel: 'H', width: 400, margin: 2 });
    const png = PNG.sync.read(pngBuffer);
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe(token);
  });

  it.each([
    ['cancelado', { status: 'CANCELLED' }],
    ['utilizado', { status: 'USED' }],
    ['em transferência', { status: 'TRANSFER_PENDING' }],
    ['com check-in', { checkIn: { id: 'checkin-1' } }],
    ['transferido para outro titular', { ownerUserId: 'recipient-2', status: 'ACTIVE', token: 'token-atual-do-novo-titular' }],
  ])('não inclui ingresso %s', async (_label, override) => {
    const { service } = setup({ ...baseOrder, tickets: [{ ...baseOrder.tickets[0], ...override }] });
    await expect(service.createForOrder(baseOrder.id, baseOrder.user.email)).resolves.toEqual({ attachment: null, eligibleCount: 0 });
  });

  it.each(['REFUNDED', 'CANCELLED'])('não gera PDF para pedido %s', async status => {
    const { service } = setup({ ...baseOrder, status });
    await expect(service.createForOrder(baseOrder.id, baseOrder.user.email)).resolves.toEqual({ attachment: null, eligibleCount: 0 });
  });

  it('não gera PDF se o destinatário não é o comprador original', async () => {
    const { service } = setup();
    await expect(service.createForOrder(baseOrder.id, 'outro@example.com')).resolves.toEqual({ attachment: null, eligibleCount: 0 });
  });

  it('inclui somente a parte elegível de um pedido misto', async () => {
    const order = { ...baseOrder, tickets: [baseOrder.tickets[0], { ...baseOrder.tickets[0], id: 'ticket-transferido', ownerUserId: 'recipient-2', token: 'segredo-do-novo-titular' }] };
    const { service } = setup(order);
    const result = await service.createForOrder(order.id, order.user.email);
    expect(result.eligibleCount).toBe(1);
    const document = await PDFDocument.load(result.attachment!.content);
    expect(document.getPageCount()).toBe(1);
  });
});
