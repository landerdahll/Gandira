import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import type { MailAttachment } from './mail.service';

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const BLUE = rgb(0x67 / 255, 0xbe / 255, 0xd9 / 255);
const DARK = rgb(0x17 / 255, 0x20 / 255, 0x27 / 255);
const MUTED = rgb(0x52 / 255, 0x60 / 255, 0x6a / 255);
const LIGHT = rgb(0xf4 / 255, 0xf7 / 255, 0xf9 / 255);

export interface TicketPdfResult {
  attachment: MailAttachment | null;
  eligibleCount: number;
}

@Injectable()
export class TicketPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async createForOrder(orderId: string, recipient: string): Promise<TicketPdfResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        userId: true,
        user: { select: { name: true, email: true } },
        event: { select: { title: true, startDate: true, endDate: true, venue: true, address: true, city: true, state: true } },
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

      for (const ticket of tickets) {
        const qr = await QRCode.toBuffer(ticket.token, {
          type: 'png', errorCorrectionLevel: 'H', width: 400, margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' },
        });
        const qrImage = await document.embedPng(qr);
        const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        this.drawPage(page, regular, bold, qrImage, {
          eventTitle: order.event.title,
          eventDate: this.eventDate(order.event.startDate, order.event.endDate),
          venue: [order.event.venue, order.event.address, order.event.city, order.event.state].filter(Boolean).join(' - '),
          holder: ticket.holderName || order.user.name,
          ticketId: ticket.id.slice(-8).toUpperCase(),
          batch: ticket.batch?.name,
        });
      }

      document.setTitle(`Ingressos - ${order.event.title}`);
      document.setAuthor('Pago by OutraHora');
      document.setCreator('Pago by OutraHora');
      document.setProducer('Pago by OutraHora');
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

  private eventDate(start: Date, end: Date) {
    const date = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    }).format(start);
    const time = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    return `${date}, ${time.format(start)} - ${time.format(end)}`;
  }

  private drawPage(page: PDFPage, regular: PDFFont, bold: PDFFont, qrImage: Awaited<ReturnType<PDFDocument['embedPng']>>, data: Record<string, string | undefined>) {
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: LIGHT });
    page.drawRectangle({ x: 32, y: 32, width: PAGE_WIDTH - 64, height: PAGE_HEIGHT - 64, color: rgb(1, 1, 1), borderColor: rgb(0xdc / 255, 0xe7 / 255, 0xec / 255), borderWidth: 1 });
    page.drawRectangle({ x: 32, y: PAGE_HEIGHT - 145, width: PAGE_WIDTH - 64, height: 113, color: BLUE });
    page.drawText('Pago', { x: 58, y: PAGE_HEIGHT - 91, size: 28, font: bold, color: DARK });
    page.drawText('by OutraHora', { x: 58, y: PAGE_HEIGHT - 116, size: 12, font: regular, color: DARK });

    let y = PAGE_HEIGHT - 190;
    y = this.drawWrapped(page, data.eventTitle || '', 58, y, 479, 22, bold, DARK, 27) - 12;
    y = this.drawLabelValue(page, regular, bold, 'DATA E HORARIO', data.eventDate || '', y);
    y = this.drawLabelValue(page, regular, bold, 'LOCAL', data.venue || '', y);
    y = this.drawLabelValue(page, regular, bold, 'TITULAR', data.holder || '', y);
    y = this.drawLabelValue(page, regular, bold, 'INGRESSO', data.ticketId || '', y);
    if (data.batch) y = this.drawLabelValue(page, regular, bold, 'LOTE', data.batch, y);

    const qrSize = 205;
    page.drawImage(qrImage, { x: (PAGE_WIDTH - qrSize) / 2, y: 160, width: qrSize, height: qrSize });
    page.drawText('Apresente este QR Code na entrada.', { x: 180, y: 140, size: 11, font: bold, color: DARK });
    this.drawWrapped(page, 'Este ingresso tambem pode ser acessado pelo sistema Pago. A validade e o titular sao sempre confirmados no momento do check-in.', 70, 112, PAGE_WIDTH - 140, 10, regular, MUTED, 14);
    page.drawText('Emitido por Pago by OutraHora', { x: 205, y: 59, size: 10, font: bold, color: MUTED });
  }

  private drawLabelValue(page: PDFPage, regular: PDFFont, bold: PDFFont, label: string, value: string, y: number) {
    page.drawText(label, { x: 58, y, size: 9, font: bold, color: BLUE });
    return this.drawWrapped(page, value, 58, y - 18, 479, 12, regular, DARK, 16) - 13;
  }

  private drawWrapped(page: PDFPage, text: string, x: number, y: number, maxWidth: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>, lineHeight: number) {
    const words = text.replace(/\s+/g, ' ').trim().split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    lines.forEach((current, index) => page.drawText(current, { x, y: y - index * lineHeight, size, font, color }));
    return y - Math.max(lines.length, 1) * lineHeight;
  }
}
