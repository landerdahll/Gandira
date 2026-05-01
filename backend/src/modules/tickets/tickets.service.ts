import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSecureToken } from '../../common/utils/crypto.util';

interface GenerateTicketInput {
  orderId: string;
  batchId: string;
  eventId: string;
}

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Gera um ingresso com token criptograficamente aleatório.
   * O QR Code contém apenas o token — nunca IDs internos.
   * Pode receber um `tx` (Prisma transaction) para ser chamado dentro de uma transação.
   */
  async generateTicket(input: GenerateTicketInput, tx?: any) {
    const db = tx ?? this.prisma;
    const token = generateSecureToken(32); // 64 hex chars — não sequencial, não previsível

    const ticket = await db.ticket.create({
      data: {
        orderId: input.orderId,
        batchId: input.batchId,
        eventId: input.eventId,
        token,
        status: 'ACTIVE',
      },
    });

    // Gera QR Code como data URL (base64 PNG) — em produção: salvar no S3 e armazenar URL
    const qrCodeUrl = await QRCode.toDataURL(token, {
      errorCorrectionLevel: 'H',
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    await db.ticket.update({
      where: { id: ticket.id },
      data: { qrCodeUrl },
    });

    this.logger.log(`Ticket ${ticket.id} generated for order ${input.orderId}`);
    return { ...ticket, qrCodeUrl };
  }

  async findUserTickets(userId: string, page = 1, limit = 20) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { order: { userId } },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { title: true, slug: true, startDate: true, venue: true, coverImage: true } },
          batch: { select: { name: true, ticketType: true } },
          checkIn: { select: { checkedAt: true } },
        },
      }),
      this.prisma.ticket.count({ where: { order: { userId } } }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / take) } };
  }

  async findOne(ticketId: string, userId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: { select: { userId: true } },
        event: { select: { title: true, startDate: true, venue: true, address: true } },
        batch: { select: { name: true, ticketType: true, price: true } },
        checkIn: { select: { checkedAt: true, method: true } },
      },
    });

    if (!ticket) throw new NotFoundException('Ingresso não encontrado');
    if (ticket.order.userId !== userId) throw new ForbiddenException('Acesso negado');

    return ticket; // includes qrCodeUrl for detail view
  }

  /**
   * Validação do QR Code pelo staff.
   * Verifica: existência, status, evento correto.
   * Marca como usado em uma transação atômica para evitar dupla entrada.
   */
  async validateAndCheckIn(token: string, eventId: string, staffId: string) {
    return this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { token },
        include: {
          checkIn: true,
          batch: { select: { name: true, ticketType: true } },
          order: { include: { user: { select: { name: true, email: true } } } },
        },
      });

      if (!ticket) return { valid: false, reason: 'Ingresso não encontrado', holder: null };

      const holder = {
        name: ticket.holderName ?? ticket.order?.user?.name ?? 'Titular não identificado',
        email: ticket.holderEmail ?? ticket.order?.user?.email ?? '',
        batch: ticket.batch?.name ?? '',
      };

      if (ticket.eventId !== eventId)
        return { valid: false, reason: 'Ingresso pertence a outro evento', holder };

      if (ticket.status === 'CANCELLED')
        return { valid: false, reason: 'Ingresso cancelado', holder };

      if (ticket.status === 'USED' || ticket.checkIn) {
        const when = ticket.checkIn?.checkedAt
          ? new Date(ticket.checkIn.checkedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          : '—';
        return { valid: false, reason: `Ingresso já utilizado às ${when}`, holder };
      }

      if (ticket.status !== 'ACTIVE')
        return { valid: false, reason: `Status inválido: ${ticket.status}`, holder };

      await Promise.all([
        tx.ticket.update({ where: { id: ticket.id }, data: { status: 'USED' } }),
        tx.checkIn.create({ data: { ticketId: ticket.id, eventId, staffId, method: 'QR_CODE' } }),
      ]);

      this.logger.log(`Ticket ${ticket.id} checked in at event ${eventId} by staff ${staffId}`);
      return { valid: true, reason: 'Entrada autorizada', holder };
    });
  }
}
