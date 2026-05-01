import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchesService } from '../batches/batches.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateOrderDto } from './dto/create-order.dto';

const ORDER_EXPIRY_MINUTES = 15;
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 10);

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private batches: BatchesService,
    private payments: PaymentsService,
  ) {}

  /**
   * Core purchase flow:
   * 1. Validate event and batches
   * 2. Reserve stock atomically (DB transaction)
   * 3. Create order with PENDING status
   * 4. Create Stripe PaymentIntent
   * 5. Return clientSecret to frontend (Stripe.js collects card)
   * Tickets are only generated after webhook confirms payment.
   */
  async create(dto: CreateOrderDto, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
    if (!event || event.status !== 'PUBLISHED') {
      throw new NotFoundException('Evento não encontrado ou indisponível');
    }
    if (new Date() > event.startDate) {
      throw new BadRequestException('Evento já iniciado, vendas encerradas');
    }

    const batchIds = dto.items.map((i) => i.batchId);
    const batchMap = new Map(
      (await this.prisma.batch.findMany({ where: { id: { in: batchIds }, eventId: dto.eventId } })).map(
        (b) => [b.id, b],
      ),
    );

    if (batchMap.size !== batchIds.length) {
      throw new BadRequestException('Um ou mais lotes inválidos para este evento');
    }

    // All DB operations in a single transaction — stock reservation is atomic
    const order = await this.prisma.$transaction(async (tx) => {
      let subtotal = new Decimal(0);
      const lineItems: Array<{ batchId: string; quantity: number; unitPrice: Decimal; total: Decimal }> = [];

      for (const item of dto.items) {
        const batch = await this.batches.reserveStock(item.batchId, item.quantity, tx);
        const unitPrice = new Decimal(batch.price.toString());
        const lineTotal = unitPrice.mul(item.quantity);
        subtotal = subtotal.add(lineTotal);
        lineItems.push({ batchId: item.batchId, quantity: item.quantity, unitPrice, total: lineTotal });
      }

      const platformFee = subtotal.mul(PLATFORM_FEE_PERCENT / 100).toDecimalPlaces(2);
      const total = subtotal.add(platformFee);
      const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MINUTES * 60 * 1000);

      return tx.order.create({
        data: {
          userId,
          eventId: dto.eventId,
          subtotal,
          platformFee,
          total,
          expiresAt,
          items: {
            create: lineItems,
          },
        },
        include: { items: true, event: { select: { title: true } } },
      });
    });

    // Create Stripe PaymentIntent (outside DB tx — external call)
    const paymentIntent = await this.payments.createPaymentIntent(order);
    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return {
      orderId: order.id,
      total: order.total,
      expiresAt: order.expiresAt,
      clientSecret: paymentIntent.client_secret, // sent to Stripe.js on frontend
    };
  }

  async findUserOrders(userId: string, page = 1, limit = 20) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { title: true, slug: true, startDate: true, coverImage: true } },
          items: {
            include: { batch: { select: { name: true, ticketType: true } } },
          },
          tickets: { select: { id: true, status: true } },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return { data, meta: { total, page, lastPage: Math.ceil(total / take) } };
  }

  async findOne(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: { select: { title: true, slug: true, startDate: true, venue: true, coverImage: true } },
        items: { include: { batch: true } },
        tickets: true,
      },
    });

    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.userId !== userId) throw new ForbiddenException('Acesso negado');

    return order;
  }

  /**
   * Cancellation policy per CDC art. 49:
   * - Allowed up to 7 days after purchase
   * - Not allowed within 48h before the event
   */
  async cancel(orderId: string, userId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { event: true, items: true },
    });

    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.userId !== userId) throw new ForbiddenException('Acesso negado');
    if (order.status !== 'PAID') {
      throw new BadRequestException('Apenas pedidos pagos podem ser cancelados');
    }

    const daysSincePurchase = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePurchase > 7) {
      throw new BadRequestException('Prazo de cancelamento (7 dias) expirado');
    }

    const hoursUntilEvent = (order.event.startDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilEvent <= 48) {
      throw new BadRequestException('Cancelamento não permitido nas 48h antes do evento');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
      });
      await tx.ticket.updateMany({
        where: { orderId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      for (const item of order.items) {
        await this.batches.releaseStock(item.batchId, item.quantity);
      }
    });

    // Trigger Stripe refund
    if (order.stripePaymentIntentId) {
      await this.payments.refund(orderId, order.stripePaymentIntentId);
    }

    this.logger.log(`Order ${orderId} cancelled by user ${userId}`);
  }

  // ── Cron: expire unpaid orders every 5 min ──────────────────────────────

  @Cron(CronExpression.EVERY_5_MINUTES)
  async expireStaleOrders() {
    const stale = await this.prisma.order.findMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
      include: { items: true },
    });

    for (const order of stale) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({ where: { id: order.id }, data: { status: 'EXPIRED' } });
          await tx.ticket.updateMany({
            where: { orderId: order.id },
            data: { status: 'CANCELLED' },
          });
          for (const item of order.items) {
            await this.batches.releaseStock(item.batchId, item.quantity);
          }
        });
        this.logger.log(`Order ${order.id} expired`);
      } catch (e) {
        this.logger.error(`Failed to expire order ${order.id}`, e);
      }
    }
  }
}
