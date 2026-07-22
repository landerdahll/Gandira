import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { BatchesService } from '../batches/batches.service';
import { PaymentsService } from '../payments/payments.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderExpirationService } from '../order-fulfillment/order-expiration.service';
import { Prisma } from '@prisma/client';
import { withSerializableRetry } from '../../common/utils/serializable-retry.util';
import { ClubBenefitsService, DiscountType } from '../club-benefits/club-benefits.service';

const ORDER_EXPIRY_MINUTES = 60;
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 10);

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private batches: BatchesService,
    private payments: PaymentsService,
    private coupons: CouponsService,
    private orderExpiration: OrderExpirationService,
    private clubBenefits: ClubBenefitsService,
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
    const buyer = await this.prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } });
    if (!buyer?.isVerified) {
      throw new ForbiddenException('Verifique seu e-mail antes de comprar ingressos');
    }

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

    // Validate coupon before entering transaction (avoids holding tx open during external checks)
    let couponId: string | undefined;
    let discountPct = 0;
    const totalQty = dto.items.reduce((sum, item) => sum + item.quantity, 0);
    if (dto.couponCode) {
      const coupon = await this.coupons.validate(dto.eventId, dto.couponCode);
      if (coupon.maxUses !== null && coupon.usedCount + totalQty > coupon.maxUses) {
        throw new BadRequestException(
          `Cupom não tem ingressos suficientes disponíveis (restam ${coupon.maxUses - coupon.usedCount})`,
        );
      }
      couponId = coupon.id;
      discountPct = coupon.discount;
    }

    // All DB operations in a single transaction — stock reservation is atomic
    let result;
    try {
      result = await withSerializableRetry(() => this.prisma.$transaction(async (tx) => {
      const now = new Date();
      let subtotal = new Decimal(0);
      const lineItems: Array<{ batchId: string; batchName: string; sortOrder: number; quantity: number; unitPrice: Decimal; total: Decimal }> = [];

      for (const item of dto.items) {
        const batch = await this.batches.reserveStock(item.batchId, item.quantity, tx);
        const unitPrice = new Decimal(batch.price.toString());
        const lineTotal = unitPrice.mul(item.quantity);
        subtotal = subtotal.add(lineTotal);
        lineItems.push({ batchId: item.batchId, batchName: batch.name, sortOrder: batch.sortOrder, quantity: item.quantity, unitPrice, total: lineTotal });
      }

      const clubDecision = await this.clubBenefits.evaluateInTransaction(tx, {
        userId,
        eventId: dto.eventId,
        items: lineItems,
        hasCoupon: Boolean(couponId),
        now,
      });
      const platformFee = subtotal
        .mul(new Decimal(PLATFORM_FEE_PERCENT).div(100))
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      const couponDiscount = discountPct > 0
        ? subtotal.mul(new Decimal(discountPct).div(100)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
        : new Decimal(0);
      const discountAmount = clubDecision.applied
        ? clubDecision.discountAmount!
        : couponDiscount;
      const total = subtotal.add(platformFee).sub(discountAmount);
      const expiresAt = new Date(now.getTime() + ORDER_EXPIRY_MINUTES * 60 * 1000);

      const order = await tx.order.create({
        data: {
          userId,
          eventId: dto.eventId,
          subtotal,
          platformFee,
          discountAmount,
          clubBenefitReason: clubDecision.reason,
          total,
          couponId,
          expiresAt,
          items: { create: lineItems.map(({ batchName: _batchName, sortOrder: _sortOrder, ...item }) => item) },
        },
        include: { items: true, event: { select: { title: true } } },
      });
      await this.clubBenefits.createReservationInTransaction(tx, clubDecision, {
        eventId: dto.eventId,
        orderId: order.id,
        expiresAt,
        now,
      });
      const discountType: DiscountType = clubDecision.applied ? 'CLUB' : couponId ? 'COUPON' : 'NONE';
      return { order, clubDecision, discountType };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
    } catch (error) {
      const target = error instanceof Prisma.PrismaClientKnownRequestError
        ? String(error.meta?.target ?? '')
        : '';
      if (error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
        && target.includes('clubMemberId')
        && target.includes('eventId')) {
        throw new ConflictException({
          message: 'Já existe uma reserva válida do benefício para este evento',
          code: 'CLUB_BENEFIT_RESERVED',
          clubBenefit: { applied: false, reason: 'RESERVED_BY_OTHER_REQUEST' },
        });
      }
      throw error;
    }
    const { order, clubDecision, discountType } = result;

    // Increment coupon usage by number of tickets purchased
    if (couponId) {
      await this.prisma.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: totalQty } },
      });
    }

    // Create Stripe PaymentIntent (outside DB tx — external call)
    let paymentIntent;
    try {
      paymentIntent = await this.payments.createPaymentIntent(order);
    } catch (error) {
      await this.orderExpiration.cancelPendingOrder(order.id, 'PAYMENT_CREATION_FAILED');
      throw error;
    }
    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return {
      orderId: order.id,
      total: order.total,
      expiresAt: order.expiresAt,
      clientSecret: paymentIntent.client_secret, // sent to Stripe.js on frontend
      discountType,
      clubBenefit: this.clubBenefits.toResponse(clubDecision),
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
          reservedClubBenefits: { include: { batch: { select: { id: true, name: true } } } },
          confirmedClubBenefits: { include: { batch: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return { data: data.map((order) => this.withBenefitResponse(order)), meta: { total, page, lastPage: Math.ceil(total / take) } };
  }

  async findOne(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: { select: { title: true, slug: true, startDate: true, venue: true, coverImage: true } },
        items: { include: { batch: true } },
        tickets: true,
        reservedClubBenefits: { include: { batch: { select: { id: true, name: true } } } },
        confirmedClubBenefits: { include: { batch: { select: { id: true, name: true } } } },
      },
    });

    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.userId !== userId) throw new ForbiddenException('Acesso negado');

    return this.withBenefitResponse(order);
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
      select: { id: true },
    });

    for (const order of stale) {
      try {
        const result = await this.orderExpiration.expirePendingOrder(order.id);
        if (result === 'EXPIRED') this.logger.log(`Order ${order.id} expired`);
      } catch (e) {
        this.logger.error(`Failed to expire order ${order.id}`, e);
      }
    }
  }

  private withBenefitResponse(order: any) {
    const usage = order.confirmedClubBenefits?.[0] ?? order.reservedClubBenefits?.[0] ?? null;
    const clubBenefit = usage ? {
      applied: true,
      reason: 'AVAILABLE',
      status: usage.status,
      discountPercentage: usage.discountPercentage.toFixed(2),
      batchId: usage.batchId,
      batchName: usage.batch?.name ?? null,
      originalAmount: usage.originalAmount?.toFixed(2) ?? null,
      discountAmount: usage.discountAmount?.toFixed(2) ?? null,
      finalAmount: usage.finalAmount?.toFixed(2) ?? null,
      quantityDiscounted: 1,
      ticketId: usage.ticketId ?? null,
    } : { applied: false, reason: order.clubBenefitReason ?? 'NOT_MEMBER' };
    const { reservedClubBenefits: _reserved, confirmedClubBenefits: _confirmed, ...safeOrder } = order;
    return {
      ...safeOrder,
      discountType: usage ? 'CLUB' : order.couponId ? 'COUPON' : 'NONE',
      clubBenefit,
    };
  }
}
