import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { withSerializableRetry } from '../../common/utils/serializable-retry.util';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TicketsService } from '../tickets/tickets.service';
import { OrderExpirationService } from './order-expiration.service';
import { ClubBenefitsService } from '../club-benefits/club-benefits.service';
import { EmailOutboxService } from '../mail/email-outbox.service';
import { getPublicFrontendUrl } from '../../common/utils/public-url.util';

export type PaymentGateway = 'STRIPE' | 'ABACATEPAY';
export type OrderFulfillmentStatus =
  | 'FULFILLED'
  | 'ALREADY_PAID'
  | 'LATE_PAYMENT_REQUIRES_REVIEW'
  | 'CLUB_BENEFIT_REQUIRES_REVIEW'
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
    private readonly clubBenefits: ClubBenefitsService,
    private readonly outbox?: EmailOutboxService,
  ) {}

  async confirmPaidOrder(input: ConfirmPaidOrderInput): Promise<OrderFulfillmentResult> {
    const result = await withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: {
          items: { include: { batch: { select: { sortOrder: true, name: true, ticketType: true } } } },
          reservedClubBenefits: true,
          user: { select: { email: true, name: true } },
          event: { select: { title: true, startDate: true, venue: true, city: true } },
        },
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
      const clubUsage = order.reservedClubBenefits[0] ?? null;
      if (clubUsage && clubUsage.status !== 'RESERVED') {
        return { status: 'CLUB_BENEFIT_REQUIRES_REVIEW' as const, orderStatus: order.status };
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

      const sortedItems = [...order.items].sort((left, right) => {
        const price = right.unitPrice.comparedTo(left.unitPrice);
        if (price !== 0) return price;
        if (left.batch.sortOrder !== right.batch.sortOrder) return left.batch.sortOrder - right.batch.sortOrder;
        return left.batchId.localeCompare(right.batchId);
      });
      let benefitedTicketId: string | null = null;
      for (const item of sortedItems) {
        for (let index = 0; index < item.quantity; index += 1) {
          const ticket = await this.tickets.generateTicket(
            { orderId: order.id, batchId: item.batchId, eventId: order.eventId },
            tx,
          );
          if (clubUsage?.batchId === item.batchId && benefitedTicketId === null) {
            benefitedTicketId = ticket.id;
          }
        }
      }
      if (clubUsage) {
        if (!benefitedTicketId) throw new Error('Ingresso beneficiado não foi gerado para o lote reservado');
        await this.clubBenefits.confirmInTransaction(tx, clubUsage.id, order.id, benefitedTicketId, now);
      }
      if (this.outbox) await this.outbox.enqueue({
        type: 'ORDER_CONFIRMATION', recipient: order.user.email, template: 'ORDER_CONFIRMATION',
        payload: { name: order.user.name, eventTitle: order.event.title, eventDate: order.event.startDate.toISOString(), venue: order.event.venue, city: order.event.city,
          items: order.items.map(item => ({ batchName: item.batch.name, quantity: item.quantity, ticketType: item.batch.ticketType })), total: Number(order.total), orderId: order.id, myTicketsUrl: `${getPublicFrontendUrl(this.config)}/my-tickets` },
        idempotencyKey: `ORDER_CONFIRMATION:${order.id}`, relatedEntityType: 'Order', relatedEntityId: order.id,
      }, tx);
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
    if (result.status === 'CLUB_BENEFIT_REQUIRES_REVIEW') {
      this.logger.error(JSON.stringify({
        event: 'CLUB_BENEFIT_REQUIRES_REVIEW',
        orderId: input.orderId,
        gateway: input.gateway,
        externalPaymentId: input.externalPaymentId ?? null,
      }));
    }
    return result;
  }
}
