import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { generateSecureToken } from '../../common/utils/crypto.util';
import { Prisma } from '@prisma/client';
import { withSerializableRetry } from '../../common/utils/serializable-retry.util';

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
    const order = await db.order.findUniqueOrThrow({ where: { id: input.orderId }, select: { userId: true } });

    const ticket = await db.ticket.create({
      data: {
        orderId: input.orderId,
        batchId: input.batchId,
        eventId: input.eventId,
        ownerUserId: order.userId,
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
    const db = this.prisma as any;
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      db.ticket.findMany({
        where: { OR: [{ ownerUserId: userId }, { transfers: { some: { senderUserId: userId } } }] },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { title: true, slug: true, startDate: true, venue: true, coverImage: true } },
          batch: { select: { name: true, ticketType: true } },
          checkIn: { select: { checkedAt: true } },
          owner: { select: { id: true, name: true } },
          transfers: {
            where: { OR: [{ senderUserId: userId }, { recipientUserId: userId }] },
            orderBy: { requestedAt: 'desc' }, take: 1,
            include: { sender: { select: { name: true } }, recipient: { select: { name: true } } },
          },
        },
      }),
      db.ticket.count({ where: { OR: [{ ownerUserId: userId }, { transfers: { some: { senderUserId: userId } } }] } }),
    ]);

    return { data: data.map((ticket: any) => ({
      ...ticket,
      accessState: ticket.ownerUserId === userId
        ? (ticket.transfers[0]?.recipientUserId === userId ? 'RECEIVED' : ticket.status)
        : (ticket.transfers[0]?.status === 'PENDING_REGISTRATION' ? 'TRANSFER_PENDING' : 'TRANSFERRED'),
      qrCodeUrl: undefined,
    })), meta: { total, page, lastPage: Math.ceil(total / take) } };
  }

  async findOne(ticketId: string, userId: string) {
    const ticket: any = await (this.prisma as any).ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: { select: { userId: true } },
        owner: { select: { id: true, name: true } },
        event: { select: { title: true, startDate: true, venue: true, address: true } },
        batch: { select: { name: true, ticketType: true, price: true } },
        checkIn: { select: { checkedAt: true, method: true } },
        transfers: { where: { OR: [{ senderUserId: userId }, { recipientUserId: userId }] }, orderBy: { requestedAt: 'desc' }, take: 1, include: { sender: { select: { name: true } }, recipient: { select: { name: true } } } },
      },
    });

    if (!ticket) throw new NotFoundException('Ingresso não encontrado');
    const related = ticket.ownerUserId === userId || ticket.transfers.some((t: any) => t.senderUserId === userId);
    if (!related) throw new ForbiddenException('Acesso negado');

    const accessState = ticket.ownerUserId === userId
      ? (ticket.transfers[0]?.recipientUserId === userId ? 'RECEIVED' : ticket.status)
      : (ticket.transfers[0]?.status === 'PENDING_REGISTRATION' ? 'TRANSFER_PENDING' : 'TRANSFERRED');
    return { ...ticket, accessState, qrCodeUrl: ticket.ownerUserId === userId && ticket.status === 'ACTIVE' ? ticket.qrCodeUrl : null };
  }

  /**
   * Validação do QR Code pelo staff.
   * Verifica: existência, status, evento correto.
   * Marca como usado em uma transação atômica para evitar dupla entrada.
   */
  async validateAndCheckIn(token: string, eventId: string, staffId: string) {
    const result = await withSerializableRetry(() => this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

      const claimed = await tx.ticket.updateMany({
        where: { id: ticket.id, token, status: 'ACTIVE' },
        data: { status: 'USED' },
      });
      if (claimed.count !== 1) return { valid: false, reason: 'Ingresso indisponível ou alterado durante a leitura', holder };
      await tx.checkIn.create({ data: { ticketId: ticket.id, eventId, staffId, method: 'QR_CODE' } });

      return { valid: true, reason: 'Entrada autorizada', holder, ticketId: ticket.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    if (result.valid) {
      this.logger.log(`Ticket ${result.ticketId} checked in at event ${eventId} by staff ${staffId}`);
      const { ticketId: _ticketId, ...response } = result;
      return response;
    }
    return result;
  }
}
