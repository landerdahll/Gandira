import { promises as dns } from 'dns';
import { createCanvas, DOMMatrix, ImageData } from 'canvas';
import { dirname } from 'path';
import { decodePDFRawStream, PDFDocument, PDFName, PDFNumber, PDFRawStream } from 'pdf-lib';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import sharp, { Sharp } from 'sharp';
import { TicketPdfService } from './ticket-pdf.service';

describe('TicketPdfService', () => {
  const token = 'ticket-token-exatamente-validado-pelo-checkin';
  const baseOrder = {
    id: 'order-123', status: 'PAID', userId: 'buyer-1', user: { name: 'Comprador', email: 'buyer@example.com' },
    event: {
      title: 'Festival Pago', startDate: new Date('2026-08-10T22:00:00.000Z'), endDate: new Date('2026-08-11T01:00:00.000Z'),
      venue: 'Casa', address: 'Rua Um, 10', city: 'São Paulo', state: 'SP', bannerImage: null, coverImage: null,
    },
    tickets: [{ id: 'ticket-ABCDEFGH', token, status: 'ACTIVE', ownerUserId: 'buyer-1', holderName: null, holderEmail: null, checkIn: null, batch: { name: 'Primeiro lote' } }],
  };

  function setup(order: any = baseOrder) {
    const prisma: any = { order: { findUnique: jest.fn().mockResolvedValue(order) } };
    return { service: new TicketPdfService(prisma), prisma };
  }

  afterEach(() => jest.restoreAllMocks());

  it('gera ticket de 100 x 210 mm, em memória, com uma página por ingresso elegível', async () => {
    const order = { ...baseOrder, tickets: [baseOrder.tickets[0], { ...baseOrder.tickets[0], id: 'ticket-IJKLMNOP', token: 'segundo-token' }] };
    const { service } = setup(order);
    const result = await service.createForOrder(order.id, order.user.email);
    expect(result.eligibleCount).toBe(2);
    expect(result.attachment?.filename).toBe('ingressos-pago-order-123.pdf');
    expect(result.attachment?.contentType).toBe('application/pdf');
    expect(result.attachment!.content.byteLength).toBeLessThan(10 * 1024 * 1024);
    const document = await PDFDocument.load(result.attachment!.content);
    expect(document.getPageCount()).toBe(2);
    expect(document.getPage(0).getWidth()).toBeCloseTo(100 * 72 / 25.4, 2);
    expect(document.getPage(0).getHeight()).toBeCloseTo(210 * 72 / 25.4, 2);
    expect(document.getAuthor()).toBe('Pago');
    expect(document.getCreator()).toBe('Pago');
  });

  it('decodifica da imagem efetivamente embutida na página exatamente Ticket.token', async () => {
    const { service } = setup();
    const result = await service.createForOrder(baseOrder.id, baseOrder.user.email);
    const document = await PDFDocument.load(result.attachment!.content);
    const qrStream = document.context.enumerateIndirectObjects()
      .map(([, object]) => object)
      .find(object => object instanceof PDFRawStream &&
        object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image') &&
        (object.dict.get(PDFName.of('Width')) as PDFNumber | undefined)?.asNumber() === 600) as PDFRawStream | undefined;
    expect(qrStream).toBeDefined();
    const pixels = decodePDFRawStream(qrStream!).decode();
    const width = (qrStream!.dict.get(PDFName.of('Width')) as PDFNumber).asNumber();
    const height = (qrStream!.dict.get(PDFName.of('Height')) as PDFNumber).asNumber();
    const png = new PNG({ width, height });
    const channels = pixels.length / (width * height);
    for (let index = 0; index < width * height; index += 1) {
      const source = index * channels;
      const target = index * 4;
      png.data[target] = pixels[source];
      png.data[target + 1] = channels === 1 ? pixels[source] : pixels[source + 1];
      png.data[target + 2] = channels === 1 ? pixels[source] : pixels[source + 2];
      png.data[target + 3] = 255;
    }
    const decoded = jsQR(new Uint8ClampedArray(png.data), width, height);
    expect(decoded?.data).toBe(token);
  });

  it('decodifica exatamente Ticket.token depois de renderizar a página completa do PDF', async () => {
    const { service } = setup();
    const result = await service.createForOrder(baseOrder.id, baseOrder.user.email);
    Object.assign(globalThis, { DOMMatrix, ImageData });
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    const standardFontDataUrl = `${dirname(require.resolve('pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf'))}/`;
    const renderedDocument = await pdfjs.getDocument({ data: new Uint8Array(result.attachment!.content), disableWorker: true, standardFontDataUrl }).promise;
    const renderedPage = await renderedDocument.getPage(1);
    const scale = 1.5;
    const viewport = renderedPage.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext('2d');
    await renderedPage.render({ canvasContext: context, viewport }).promise;
    const qrSize = Math.round(132 * scale);
    const qrX = Math.round(((100 * 72 / 25.4 - 132) / 2) * scale);
    const qrY = Math.round((210 * 72 / 25.4 - 54 - 132) * scale);
    const crop = context.getImageData(qrX, qrY, qrSize, qrSize);
    const decoded = jsQR(new Uint8ClampedArray(crop.data), crop.width, crop.height);
    expect(decoded?.data).toBe(token);
    await renderedDocument.destroy();
  }, 30_000);

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

  it('prioriza bannerImage e reutiliza a imagem processada em todas as páginas', async () => {
    const jpeg = await sharp({ create: { width: 80, height: 40, channels: 3, background: '#67bed9' } }).jpeg().toBuffer();
    const order = {
      ...baseOrder,
      event: { ...baseOrder.event, bannerImage: 'https://res.cloudinary.com/demo/banner.webp', coverImage: 'https://res.cloudinary.com/demo/cover.webp' },
      tickets: [baseOrder.tickets[0], { ...baseOrder.tickets[0], id: 'ticket-IJKLMNOP', token: 'segundo-token' }],
    };
    const { service } = setup(order);
    const download = jest.spyOn(service as any, 'downloadTrustedImage').mockResolvedValue(jpeg);
    const result = await service.createForOrder(order.id, order.user.email);
    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith(order.event.bannerImage);
    expect(result.eligibleCount).toBe(2);
  });

  it('usa coverImage como fallback e gera sem imagem quando ambas estão ausentes', async () => {
    const jpeg = await sharp({ create: { width: 80, height: 40, channels: 3, background: '#ffffff' } }).jpeg().toBuffer();
    const withCover = { ...baseOrder, event: { ...baseOrder.event, coverImage: 'https://res.cloudinary.com/demo/cover.jpg' } };
    const first = setup(withCover);
    const download = jest.spyOn(first.service as any, 'downloadTrustedImage').mockResolvedValue(jpeg);
    await expect(first.service.createForOrder(withCover.id, withCover.user.email)).resolves.toMatchObject({ eligibleCount: 1 });
    expect(download).toHaveBeenCalledWith(withCover.event.coverImage);

    const second = setup();
    const noDownload = jest.spyOn(second.service as any, 'downloadTrustedImage');
    await expect(second.service.createForOrder(baseOrder.id, baseOrder.user.email)).resolves.toMatchObject({ eligibleCount: 1 });
    expect(noDownload).not.toHaveBeenCalled();
  });

  it.each([
    ['JPEG', 'image/jpeg', (input: Sharp) => input.jpeg()],
    ['PNG', 'image/png', (input: Sharp) => input.png()],
    ['WebP', 'image/webp', (input: Sharp) => input.webp()],
  ])('aceita e normaliza banner %s', async (_format, contentType, encode) => {
    const image = await encode(sharp({ create: { width: 64, height: 32, channels: 3, background: '#67bed9' } })).toBuffer();
    jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '104.18.1.1', family: 4 }] as any);
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(image, { status: 200, headers: { 'content-type': contentType, 'content-length': String(image.length) } }));
    const { service } = setup({ ...baseOrder, event: { ...baseOrder.event, bannerImage: `https://res.cloudinary.com/demo/banner.${_format.toLowerCase()}` } });
    await expect(service.createForOrder(baseOrder.id, baseOrder.user.email)).resolves.toMatchObject({ eligibleCount: 1 });
  });

  it('faz fallback visual quando o banner falha e não expõe a URL no aviso', async () => {
    const order = { ...baseOrder, event: { ...baseOrder.event, bannerImage: 'https://evil.example/internal/secret.jpg' } };
    const { service } = setup(order);
    const warn = jest.spyOn((service as any).logger, 'warn').mockImplementation();
    const result = await service.createForOrder(order.id, order.user.email);
    expect(result.attachment).not.toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.not.stringContaining('evil.example'));
  });

  it('bloqueia HTTP, host não confiável e resolução privada', async () => {
    const { service } = setup();
    await expect((service as any).validateImageUrl('http://res.cloudinary.com/demo/image.jpg')).rejects.toThrow('protocolo');
    await expect((service as any).validateImageUrl('https://localhost/image.jpg')).rejects.toThrow('host');
    await expect((service as any).validateImageUrl('https://127.0.0.1/image.jpg')).rejects.toThrow('host');
    await expect((service as any).validateImageUrl('https://example.com/image.jpg')).rejects.toThrow('host');
    jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '10.0.0.8', family: 4 }] as any);
    await expect((service as any).validateImageUrl('https://res.cloudinary.com/demo/image.jpg')).rejects.toThrow('destino');
  });

  it('limita payload a 8 MB e valida Content-Type', async () => {
    jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '104.18.1.1', family: 4 }] as any);
    const { service } = setup();
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(new Response('x', { status: 200, headers: { 'content-type': 'text/html' } }));
    await expect((service as any).downloadTrustedImage('https://res.cloudinary.com/demo/image.jpg')).rejects.toThrow('Content-Type');
    (global.fetch as jest.Mock).mockResolvedValueOnce(new Response('x', { status: 200, headers: { 'content-type': 'image/jpeg', 'content-length': String(8 * 1024 * 1024 + 1) } }));
    await expect((service as any).downloadTrustedImage('https://res.cloudinary.com/demo/image.jpg')).rejects.toThrow('8 MB');
  });

  it('revalida redirects e bloqueia redirecionamento para destino interno', async () => {
    jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '104.18.1.1', family: 4 }] as any);
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 302, headers: { location: 'https://localhost/internal.jpg' } }));
    const { service } = setup();
    await expect((service as any).downloadTrustedImage('https://res.cloudinary.com/demo/image.jpg')).rejects.toThrow('host');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('interrompe download que excede o timeout', async () => {
    jest.useFakeTimers();
    try {
      jest.spyOn(dns, 'lookup').mockResolvedValue([{ address: '104.18.1.1', family: 4 }] as any);
      jest.spyOn(global, 'fetch').mockImplementation((_url, options) => new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }));
      const { service } = setup();
      const pending = (service as any).downloadTrustedImage('https://res.cloudinary.com/demo/image.jpg');
      const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
      await jest.advanceTimersByTimeAsync(5_001);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it('limita e redimensiona textos longos sem aumentar a página ou ultrapassar 10 MB', async () => {
    const long = 'Texto extremamente longo para validar os limites visuais do ingresso físico '.repeat(20);
    const order = {
      ...baseOrder,
      user: { ...baseOrder.user, name: long },
      event: { ...baseOrder.event, title: long, venue: long, address: long, city: long },
      tickets: [{ ...baseOrder.tickets[0], holderName: long, batch: { name: long } }],
    };
    const { service } = setup(order);
    const result = await service.createForOrder(order.id, order.user.email);
    expect(result.attachment!.content.byteLength).toBeLessThan(10 * 1024 * 1024);
    const document = await PDFDocument.load(result.attachment!.content);
    expect(document.getPage(0).getHeight()).toBeCloseTo(210 * 72 / 25.4, 2);
  });
});
