import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFImage, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { promises as dns } from 'dns';
import { existsSync, readFileSync } from 'fs';
import { isIP } from 'net';
import { resolve } from 'path';
import * as QRCode from 'qrcode';
import sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service';
import type { MailAttachment } from './mail.service';

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_BANNER_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 2;
const BANNER_TIMEOUT_MS = 5_000;
const PAGE_WIDTH = 100 * 72 / 25.4;
const PAGE_HEIGHT = 195 * 72 / 25.4;
const BLUE = rgb(0x67 / 255, 0xbe / 255, 0xd9 / 255);
const BLUE_DARK = rgb(0x28 / 255, 0x7f / 255, 0x9a / 255);
const DARK = rgb(0x17 / 255, 0x20 / 255, 0x27 / 255);
const MUTED = rgb(0x52 / 255, 0x60 / 255, 0x6a / 255);
const LIGHT = rgb(0xf4 / 255, 0xf7 / 255, 0xf9 / 255);
const BORDER = rgb(0xd2 / 255, 0xdd / 255, 0xe2 / 255);
const TRUSTED_IMAGE_HOSTS = new Set(['res.cloudinary.com']);
const OFFICIAL_LOGO_SVG = loadOfficialLogoSvg();

function loadOfficialLogoSvg() {
  const candidates = [
    resolve(process.cwd(), '../logo-full-blue.svg'),
    resolve(process.cwd(), 'logo-full-blue.svg'),
    resolve(__dirname, '../../../../../logo-full-blue.svg'),
    resolve(__dirname, '../../../../logo-full-blue.svg'),
  ];
  const logoPath = candidates.find(candidate => existsSync(candidate));
  if (!logoPath) throw new Error('Logotipo oficial do Pago não encontrado');
  return readFileSync(logoPath);
}

export interface TicketPdfResult {
  attachment: MailAttachment | null;
  eligibleCount: number;
}

interface PageData {
  eventTitle: string;
  eventDate: string;
  venue: string;
  holder: string;
  ticketId: string;
  batch?: string;
}

@Injectable()
export class TicketPdfService {
  private readonly logger = new Logger(TicketPdfService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createForOrder(orderId: string, recipient: string): Promise<TicketPdfResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        userId: true,
        user: { select: { name: true, email: true } },
        event: {
          select: {
            title: true, startDate: true, endDate: true, venue: true, address: true, city: true, state: true,
            bannerImage: true, coverImage: true,
          },
        },
        tickets: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            token: true,
            status: true,
            ownerUserId: true,
            holderName: true,
            holderEmail: true,
            checkIn: { select: { id: true } },
            batch: { select: { name: true } },
          },
        },
      },
    });

    const recipientMatchesBuyer = order?.user.email.trim().toLowerCase() === recipient.trim().toLowerCase();
    if (!order || order.status !== 'PAID' || !recipientMatchesBuyer) return { attachment: null, eligibleCount: 0 };

    const tickets = order.tickets.filter(ticket =>
      ticket.status === 'ACTIVE' &&
      ticket.ownerUserId === order.userId &&
      !ticket.checkIn,
    );
    if (tickets.length === 0) return { attachment: null, eligibleCount: 0 };

    try {
      const document = await PDFDocument.create();
      const regular = await document.embedFont(StandardFonts.Helvetica);
      const bold = await document.embedFont(StandardFonts.HelveticaBold);
      const logo = await document.embedPng(await sharp(OFFICIAL_LOGO_SVG).resize({ width: 320 }).png().toBuffer());
      const banner = await this.loadBanner(document, order.event.coverImage ?? order.event.bannerImage);

      for (const ticket of tickets) {
        const qr = await QRCode.toBuffer(ticket.token, {
          type: 'png', errorCorrectionLevel: 'H', width: 600, margin: 4,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        const qrImage = await document.embedPng(qr);
        const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        this.drawPage(page, regular, bold, qrImage, logo, banner, {
          eventTitle: order.event.title,
          eventDate: this.eventDate(order.event.startDate, order.event.endDate),
          venue: [order.event.venue, order.event.address, order.event.city, order.event.state].filter(Boolean).join(' - '),
          holder: ticket.holderName || order.user.name,
          ticketId: ticket.id.slice(-8).toUpperCase(),
          batch: ticket.batch?.name,
        });
      }

      document.setTitle(`Ingressos - ${order.event.title}`);
      document.setAuthor('Pago');
      document.setCreator('Pago');
      document.setProducer('Pago');
      const bytes = await document.save({ useObjectStreams: true });
      if (bytes.byteLength > MAX_PDF_BYTES) {
        throw new Error(`PDF excede o limite interno de 10 MB (${bytes.byteLength} bytes)`);
      }
      return {
        attachment: {
          filename: `ingressos-pago-${order.id}.pdf`,
          content: Buffer.from(bytes),
          contentType: 'application/pdf',
        },
        eligibleCount: tickets.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'falha desconhecida';
      throw new Error(`[PDF_GENERATION] pedido=${order.id}: ${message}`);
    }
  }

  private async loadBanner(document: PDFDocument, imageUrl?: string | null): Promise<PDFImage | null> {
    if (!imageUrl) return null;
    try {
      const source = await this.downloadTrustedImage(imageUrl);
      const normalized = await sharp(source, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(900, 420, { fit: 'cover', position: 'centre', withoutEnlargement: false })
        .jpeg({ quality: 82, progressive: true, mozjpeg: true })
        .toBuffer();
      return await document.embedJpg(normalized);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'falha desconhecida';
      this.logger.warn(`Banner do ingresso indisponível; usando cabeçalho Pago (${this.safeBannerError(reason)})`);
      return null;
    }
  }

  private async downloadTrustedImage(input: string): Promise<Buffer> {
    let current = input;
    for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
      const url = await this.validateImageUrl(current);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BANNER_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(url, { redirect: 'manual', signal: controller.signal, headers: { Accept: 'image/jpeg,image/png,image/webp' } });
      } finally {
        clearTimeout(timer);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location || redirect === MAX_REDIRECTS) throw new Error('limite de redirecionamentos excedido');
        current = new URL(location, url).toString();
        continue;
      }
      if (!response.ok) throw new Error(`servidor de imagem respondeu ${response.status}`);

      const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
      if (!contentType || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) throw new Error('Content-Type de imagem não permitido');
      const declaredLength = Number(response.headers.get('content-length') || 0);
      if (declaredLength > MAX_BANNER_BYTES) throw new Error('imagem excede 8 MB');
      if (!response.body) throw new Error('imagem sem conteúdo');

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      const bodyTimer = setTimeout(() => controller.abort(), BANNER_TIMEOUT_MS);
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          if (received > MAX_BANNER_BYTES) {
            await reader.cancel();
            throw new Error('imagem excede 8 MB');
          }
          chunks.push(value);
        }
      } finally {
        clearTimeout(bodyTimer);
      }
      return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)), received);
    }
    throw new Error('redirecionamento inválido');
  }

  private async validateImageUrl(input: string): Promise<URL> {
    let url: URL;
    try { url = new URL(input); } catch { throw new Error('URL de imagem inválida'); }
    if (url.protocol !== 'https:') throw new Error('protocolo de imagem não permitido');
    if (url.username || url.password || url.port) throw new Error('URL de imagem não permitida');
    const hostname = url.hostname.toLowerCase();
    if (!TRUSTED_IMAGE_HOSTS.has(hostname) || hostname === 'localhost' || isIP(hostname)) throw new Error('host de imagem não permitido');
    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => this.isPrivateAddress(address))) throw new Error('destino de imagem não permitido');
    return url;
  }

  private isPrivateAddress(address: string) {
    const normalized = address.toLowerCase();
    if (isIP(normalized) === 4) {
      const [a, b] = normalized.split('.').map(Number);
      return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
    }
    if (isIP(normalized) === 6) {
      return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('::ffff:');
    }
    return true;
  }

  private safeBannerError(message: string) {
    return message.replace(/https?:\/\/\S+/gi, '[URL removida]').slice(0, 160);
  }

  private eventDate(start: Date, end: Date) {
    const date = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    }).format(start);
    const time = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    return `${date}, ${time.format(start)} - ${time.format(end)}`;
  }

  private drawPage(page: PDFPage, regular: PDFFont, bold: PDFFont, qrImage: PDFImage, logo: PDFImage, banner: PDFImage | null, data: PageData) {
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: LIGHT });
    page.drawRectangle({ x: 8, y: 8, width: PAGE_WIDTH - 16, height: PAGE_HEIGHT - 16, color: rgb(1, 1, 1), borderColor: BORDER, borderWidth: 0.8 });
    this.drawBanner(page, logo, banner);

    let y = 397;
    y = this.drawFittedWrapped(page, data.eventTitle, 22, y, PAGE_WIDTH - 44, bold, DARK, { maxSize: 14.5, minSize: 10.5, maxLines: 3, lineHeightRatio: 1.14 }) - 3;
    y = this.drawLabelValue(page, regular, bold, 'DATA E HORARIO', data.eventDate, y, 2);
    y = this.drawLabelValue(page, regular, bold, 'LOCAL', data.venue, y, 2);

    const detailY = Math.max(y - 2, 248);
    const columnWidth = (PAGE_WIDTH - 54) / 2;
    this.drawCompactField(page, regular, bold, 'TITULAR', data.holder, 22, detailY, columnWidth, 2);
    this.drawCompactField(page, regular, bold, 'LOTE', data.batch || 'Nao informado', 30 + columnWidth, detailY, columnWidth, 2);
    this.drawCompactField(page, regular, bold, 'INGRESSO', data.ticketId, 22, detailY - 40, PAGE_WIDTH - 44, 1);

    const perforationY = 200;
    this.drawPerforation(page, perforationY);
    page.drawText('APRESENTE NA ENTRADA', { x: 22, y: perforationY + 10, size: 6.5, font: bold, color: MUTED });

    const qrSize = 132;
    page.drawRectangle({ x: (PAGE_WIDTH - qrSize) / 2 - 5, y: 39, width: qrSize + 10, height: qrSize + 10, color: rgb(1, 1, 1) });
    page.drawImage(qrImage, { x: (PAGE_WIDTH - qrSize) / 2, y: 44, width: qrSize, height: qrSize });
    const instruction = 'Apresente este QR Code no check-in';
    page.drawText(instruction, { x: (PAGE_WIDTH - bold.widthOfTextAtSize(instruction, 7.7)) / 2, y: 29, size: 7.7, font: bold, color: DARK });
    const footer = 'pago.outrahora.com';
    page.drawText(footer, { x: (PAGE_WIDTH - regular.widthOfTextAtSize(footer, 7.3)) / 2, y: 14, size: 7.3, font: regular, color: MUTED });
  }

  private drawBanner(page: PDFPage, logo: PDFImage, banner: PDFImage | null) {
    const x = 9;
    const y = 420;
    const width = PAGE_WIDTH - 18;
    const height = PAGE_HEIGHT - y - 9;
    if (banner) {
      page.drawImage(banner, { x, y, width, height });
    } else {
      page.drawRectangle({ x, y, width, height, color: rgb(0xe8 / 255, 0xf6 / 255, 0xfb / 255) });
      for (let offset = 0; offset <= width - 60; offset += 28) {
        page.drawLine({ start: { x: x + offset, y }, end: { x: x + offset + 60, y: y + height }, thickness: 0.6, color: BLUE, opacity: 0.28 });
      }
      page.drawRectangle({ x: 18, y: PAGE_HEIGHT - 45, width: 70, height: 27, color: rgb(1, 1, 1), opacity: 0.96, borderColor: BORDER, borderWidth: 0.5 });
      const logoHeight = 22;
      const logoWidth = logo.width / logo.height * logoHeight;
      page.drawImage(logo, { x: 53 - logoWidth / 2, y: PAGE_HEIGHT - 42.5, width: logoWidth, height: logoHeight });
    }
  }

  private drawPerforation(page: PDFPage, y: number) {
    page.drawCircle({ x: 8, y, size: 8, color: LIGHT });
    page.drawCircle({ x: PAGE_WIDTH - 8, y, size: 8, color: LIGHT });
    for (let x = 21; x < PAGE_WIDTH - 21; x += 10) {
      page.drawLine({ start: { x, y }, end: { x: Math.min(x + 5, PAGE_WIDTH - 21), y }, thickness: 0.8, color: MUTED, opacity: 0.72 });
    }
  }

  private drawLabelValue(page: PDFPage, regular: PDFFont, bold: PDFFont, label: string, value: string, y: number, maxLines: number) {
    page.drawText(label, { x: 22, y, size: 6.5, font: bold, color: BLUE_DARK });
    return this.drawFittedWrapped(page, value, 22, y - 11, PAGE_WIDTH - 44, regular, DARK, { maxSize: 9.2, minSize: 7.8, maxLines, lineHeightRatio: 1.25 }) - 6;
  }

  private drawCompactField(page: PDFPage, regular: PDFFont, bold: PDFFont, label: string, value: string, x: number, y: number, width: number, maxLines: number) {
    page.drawText(label, { x, y, size: 6.5, font: bold, color: BLUE_DARK });
    this.drawFittedWrapped(page, value, x, y - 11, width, regular, DARK, { maxSize: 8.3, minSize: 6.9, maxLines, lineHeightRatio: 1.22 });
  }

  private drawFittedWrapped(page: PDFPage, text: string, x: number, y: number, maxWidth: number, font: PDFFont, color: ReturnType<typeof rgb>, options: { maxSize: number; minSize: number; maxLines: number; lineHeightRatio: number }) {
    const clean = text.replace(/\s+/g, ' ').trim();
    let size = options.maxSize;
    let lines = this.wrap(clean, font, size, maxWidth);
    while (lines.length > options.maxLines && size > options.minSize) {
      size = Math.max(options.minSize, size - 0.5);
      lines = this.wrap(clean, font, size, maxWidth);
    }
    if (lines.length > options.maxLines) {
      lines = lines.slice(0, options.maxLines);
      let last = lines[lines.length - 1];
      while (last && font.widthOfTextAtSize(`${last}...`, size) > maxWidth) last = last.slice(0, -1).trimEnd();
      lines[lines.length - 1] = `${last}...`;
    }
    const lineHeight = size * options.lineHeightRatio;
    lines.forEach((line, index) => page.drawText(line, { x, y: y - index * lineHeight, size, font, color }));
    return y - Math.max(lines.length, 1) * lineHeight;
  }

  private wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
    const words = text.split(' ').filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const originalWord of words) {
      let word = originalWord;
      while (font.widthOfTextAtSize(word, size) > maxWidth && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(`${word.slice(0, cut)}-`, size) > maxWidth) cut -= 1;
        if (line) { lines.push(line); line = ''; }
        lines.push(`${word.slice(0, cut)}-`);
        word = word.slice(cut);
      }
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }
}
