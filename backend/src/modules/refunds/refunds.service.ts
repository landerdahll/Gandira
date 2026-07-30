import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { StripeRefundProvider } from './stripe-refund.provider';
import { AbacateRefundProvider } from './abacate-refund.provider';
import { RefundProvider } from './refund-provider';
import { EmailOutboxService } from '../mail/email-outbox.service';

export const CANCELLATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const EVENT_CUTOFF_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);
  constructor(private prisma: PrismaService, private stripe: StripeRefundProvider, private abacate: AbacateRefundProvider, private mail: MailService, private outbox?: EmailOutboxService) {}

  eligibility(order: { status: string; createdAt: Date; event: { startDate: Date }; tickets?: Array<{ status: string; checkIn?: unknown }> }, now = new Date()) {
    if (order.status === 'REFUNDED') return { eligible: false, code: 'ALREADY_REFUNDED', message: 'Este pedido já foi reembolsado.' };
    if (['REFUND_PENDING', 'REFUND_FAILED'].includes(order.status)) return { eligible: false, code: order.status, message: order.status === 'REFUND_PENDING' ? 'O reembolso deste pedido já está em processamento.' : 'O reembolso anterior falhou. Entre em contato com o suporte.' };
    if (order.status !== 'PAID') return { eligible: false, code: 'INVALID_STATUS', message: 'Este pedido não permite cancelamento.' };
    if (order.tickets?.some(t => t.status === 'USED' || Boolean(t.checkIn))) return { eligible: false, code: 'TICKET_USED', message: 'Pedidos com ingresso já utilizado não podem ser cancelados.' };
    if (now.getTime() - order.createdAt.getTime() > CANCELLATION_WINDOW_MS) return { eligible: false, code: 'PURCHASE_WINDOW_EXPIRED', message: 'O período para cancelamento deste ingresso expirou.' };
    if (order.event.startDate.getTime() - now.getTime() < EVENT_CUTOFF_MS) return { eligible: false, code: 'EVENT_TOO_CLOSE', message: 'Este evento inicia em menos de 48 horas e não permite mais cancelamento automático.' };
    return { eligible: true, code: 'ELIGIBLE', message: 'Pedido elegível para cancelamento.' };
  }

  async cancel(orderId: string, userId: string, acceptedPolicy: boolean, ipAddress?: string) {
    if (!acceptedPolicy) throw new BadRequestException('É necessário concordar com a Política de Cancelamento e Reembolso.');
    const now = new Date();
    const claimed: any = await this.prisma.$transaction(async rawTx => {
      const tx = rawTx as any;
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { event: true, items: true, tickets: { include: { checkIn: true } }, user: true } });
      if (!order) throw new NotFoundException('Pedido não encontrado');
      if (order.userId !== userId) throw new ForbiddenException('Acesso negado');
      const eligibility = this.eligibility(order, now);
      if (!eligibility.eligible) throw new ConflictException(eligibility);
      const updated = await tx.order.updateMany({ where: { id: orderId, status: 'PAID' }, data: { status: 'REFUND_PENDING', cancelledAt: now, cancelReason: 'CUSTOMER_REQUEST' } });
      if (updated.count !== 1) throw new ConflictException('Outro cancelamento já está em andamento.');
      const refund = await tx.refund.create({ data: { orderId, userId, gateway: order.paymentProvider, amount: order.total, status: 'REFUND_PENDING', ipAddress } });
      await tx.auditLog.create({ data: { userId, action: 'REFUND_REQUESTED', entity: 'Order', entityId: orderId, ipAddress, metadata: { gateway: order.paymentProvider, refundId: refund.id, amount: order.total.toString(), result: 'REFUND_PENDING' } } });
      return { order, refund };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    const provider = this.provider(claimed.order.paymentProvider);
    const paymentId = claimed.order.paymentProvider === 'STRIPE' ? claimed.order.stripePaymentIntentId : claimed.order.externalPaymentId;
    try {
      if (!paymentId) throw new Error('Identificador do pagamento não encontrado');
      const result = await provider.refund({ orderId, paymentId, amountCents: new Prisma.Decimal(claimed.order.total).mul(100).round().toNumber() });
      await this.complete(claimed.order, userId, result.refundId, provider.gateway, ipAddress);
      return { status: 'REFUNDED', refundId: result.refundId };
    } catch (error: any) {
      const reason = String(error?.message ?? 'Falha desconhecida').slice(0, 500);
      await this.prisma.$transaction(async rawTx => {
        const tx = rawTx as any;
        await tx.order.update({ where: { id: orderId }, data: { status: 'REFUND_FAILED', refundFailureReason: reason } });
        await tx.refund.update({ where: { orderId }, data: { status: 'REFUND_FAILED', failureReason: reason } });
        await tx.auditLog.create({ data: { userId, action: 'REFUND_FAILED', entity: 'Order', entityId: orderId, ipAddress, metadata: { gateway: provider.gateway, amount: claimed.order.total.toString(), result: 'REFUND_FAILED', reason } } });
      });
      throw new BadRequestException('Não foi possível processar o reembolso. Nenhuma nova tentativa automática será realizada; contate o suporte.');
    }
  }

  private async complete(order: any, userId: string, gatewayRefundId: string, gateway: string, ipAddress?: string) {
    const orderId = order.id;
    const now = new Date();
    await this.prisma.$transaction(async rawTx => {
      const tx = rawTx as any;
      const refund = await tx.refund.findUniqueOrThrow({ where: { orderId } });
      await tx.order.update({ where: { id: orderId }, data: { status: 'REFUNDED', refundedAt: now, refundId: gatewayRefundId, stripeRefundId: gateway === 'STRIPE' ? gatewayRefundId : undefined, refundFailureReason: null } });
      await tx.refund.update({ where: { orderId }, data: { status: 'REFUNDED', gatewayRefundId, completedAt: now } });
      await tx.ticket.updateMany({ where: { orderId, status: { not: 'USED' } }, data: { status: 'CANCELLED', cancelledAt: now, qrCodeUrl: null } });
      for (const item of order.items) await tx.batch.update({ where: { id: item.batchId }, data: { sold: { decrement: item.quantity } } });
      if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { decrement: order.tickets.length } } });
      await tx.auditLog.create({ data: { userId, action: 'REFUND_COMPLETED', entity: 'Order', entityId: orderId, ipAddress, metadata: { gateway, refundId: gatewayRefundId, amount: refund.amount.toString(), result: 'REFUNDED' } } });
      if (this.outbox) await this.outbox.enqueue({ type: 'REFUND_CONFIRMATION', recipient: order.user.email, template: 'REFUND_CONFIRMATION', payload: { name: order.user.name, orderId, eventTitle: order.event.title, eventDate: order.event.startDate.toISOString(), total: Number(order.total), refundId: gatewayRefundId }, idempotencyKey: `REFUND_CONFIRMATION:${gatewayRefundId}`, relatedEntityType: 'Refund', relatedEntityId: refund.id }, tx);
    });
  }

  async adminList(page = 1, limit = 20) {
    const take = Math.min(limit, 50), skip = (page - 1) * take;
    const db = this.prisma as any;
    const [data, total] = await Promise.all([db.refund.findMany({ skip, take, orderBy: { requestedAt: 'desc' }, include: { order: { include: { user: { select: { name: true, email: true } }, event: { select: { title: true } } } } } }), db.refund.count()]);
    return { data, meta: { total, page, lastPage: Math.ceil(total / take) } };
  }

  private provider(gateway: string): RefundProvider { return gateway === 'ABACATEPAY' ? this.abacate : this.stripe; }
}
