import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { withSerializableRetry } from '../../common/utils/serializable-retry.util';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TicketsService } from '../tickets/tickets.service';
import { OrderExpirationService } from './order-expiration.service';

export type PaymentGateway = 'STRIPE' | 'ABACATEPAY';
export type OrderFulfillmentStatus =
  | 'FULFILLED'
  | 'ALREADY_PAID'
  | 'LATE_PAYMENT_REQUIRES_REVIEW'
  | 'ORDER_NOT_PAYABLE'
  | 'ORDER_NOT_FOUND';

export interface ConfirmPaidOrderInput {
  orderId: string;
  gateway: PaymentGateway;
  externalPaymentId?: string;
  stripeChargeId?: string;
}

export interface OrderFulfillmentResult {
  status: OrderFulfillmentStatus;
  orderStatus?: string;
}

@Injectable()
export class OrderFulfillmentService {
  private readonly logger = new Logger(OrderFulfillmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly expiration: OrderExpirationService,
  ) {}

  async confirmPaidOrder(input: ConfirmPaidOrderInput): Promise<OrderFulfillmentResult> {
    const now = new Date();
    const result = await withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { items: true },
      });
      if (!order) return { status: 'ORDER_NOT_FOUND' as const };
      if (order.status === 'PAID') return { status: 'ALREADY_PAID' as const, orderStatus: order.status };
      if (order.status === 'EXPIRED') {
        return { status: 'LATE_PAYMENT_REQUIRES_REVIEW' as const, orderStatus: order.status };
      }
      if (order.status !== 'PENDING') {
        return { status: 'ORDER_NOT_PAYABLE' as const, orderStatus: order.status };
      }
      if (order.expiresAt <= now) {
        await this.expiration.expirePendingOrderInTransaction(tx, order.id, now);
        return { status: 'LATE_PAYMENT_REQUIRES_REVIEW' as const, orderStatus: 'EXPIRED' };
      }

      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING', expiresAt: { gt: now } },
        data: {
          status: 'PAID',
          ...(input.gateway === 'STRIPE' && input.stripeChargeId
            ? { stripeChargeId: input.stripeChargeId }
            : {}),
        },
      });
      if (claimed.count !== 1) {
        const current = await tx.order.findUnique({ where: { id: order.id }, select: { status: true } });
        if (current?.status === 'PAID') return { status: 'ALREADY_PAID' as const, orderStatus: current.status };
        if (current?.status === 'EXPIRED') return { status: 'LATE_PAYMENT_REQUIRES_REVIEW' as const, orderStatus: current.status };
        return { status: 'ORDER_NOT_PAYABLE' as const, orderStatus: current?.status };
      }

      for (const item of order.items) {
        for (let index = 0; index < item.quantity; index += 1) {
          await this.tickets.generateTicket(
            { orderId: order.id, batchId: item.batchId, eventId: order.eventId },
            tx,
          );
        }
      }
      return { status: 'FULFILLED' as const, orderStatus: 'PAID' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));

    if (result.status === 'LATE_PAYMENT_REQUIRES_REVIEW') {
      this.logger.error(JSON.stringify({
        event: 'LATE_PAYMENT_REQUIRES_REVIEW',
        orderId: input.orderId,
        gateway: input.gateway,
        externalPaymentId: input.externalPaymentId ?? null,
      }));
    }
    if (result.status === 'FULFILLED') {
      await this.sendConfirmationEmail(input.orderId).catch((error) => {
        this.logger.error(`Falha ao enviar e-mail de confirmação do pedido ${input.orderId}: ${error.message}`);
      });
    }
    return result;
  }

  /**
   * Best effort: uma queda entre o commit e este envio pode perder o e-mail.
   * Garantia de entrega exige outbox ou job persistente em uma etapa futura.
   */
  private async sendConfirmationEmail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true, name: true } },
        event: { select: { title: true, startDate: true, venue: true, city: true } },
        items: { include: { batch: { select: { name: true, ticketType: true } } } },
        tickets: { select: { id: true } },
      },
    });
    if (!order) return;
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000').split(',')[0].trim();
    await this.mail.sendOrderConfirmation(order.user.email, order.user.name, {
      eventTitle: order.event.title,
      eventDate: order.event.startDate,
      venue: `${order.event.venue}, ${order.event.city}`,
      items: order.items.map((item) => ({
        batchName: item.batch.name,
        ticketType: item.batch.ticketType,
        quantity: item.quantity,
      })),
      total: Number(order.total),
      ticketCount: order.tickets.length,
      myTicketsUrl: `${frontendUrl}/my-tickets`,
    });
  }
}
