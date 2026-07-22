import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export type ClubBenefitReason =
  | 'AVAILABLE'
  | 'NOT_MEMBER'
  | 'INACTIVE_MEMBER'
  | 'ALREADY_USED'
  | 'RESERVED_BY_OTHER_REQUEST'
  | 'NO_PAID_TICKETS';

export type DiscountType = 'NONE' | 'COUPON' | 'CLUB';

export interface ClubEligibleItem {
  batchId: string;
  batchName: string;
  sortOrder: number;
  unitPrice: Prisma.Decimal;
  quantity: number;
}

export interface ClubBenefitDecision {
  applied: boolean;
  reason: ClubBenefitReason;
  clubMemberId?: string;
  discountPercentage?: Prisma.Decimal;
  batchId?: string;
  batchName?: string;
  originalAmount?: Prisma.Decimal;
  discountAmount?: Prisma.Decimal;
  finalAmount?: Prisma.Decimal;
}

@Injectable()
export class ClubBenefitsService {
  async evaluateInTransaction(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      eventId: string;
      items: ClubEligibleItem[];
      hasCoupon: boolean;
      now: Date;
    },
  ): Promise<ClubBenefitDecision> {
    const user = await tx.user.findUnique({ where: { id: input.userId }, select: { email: true } });
    if (!user) return { applied: false, reason: 'NOT_MEMBER' };

    const normalizedEmail = user.email.trim().toLowerCase();
    const member = await tx.clubMember.findUnique({ where: { email: normalizedEmail } });
    if (!member) return { applied: false, reason: 'NOT_MEMBER' };
    if (!member.isActive) return { applied: false, reason: 'INACTIVE_MEMBER' };

    const activeUsage = await tx.clubBenefitUsage.findFirst({
      where: { clubMemberId: member.id, eventId: input.eventId, activeMarker: true },
      orderBy: { createdAt: 'desc' },
    });

    if (activeUsage?.status === 'CONFIRMED') {
      return { applied: false, reason: 'ALREADY_USED' };
    }
    if (activeUsage?.status === 'RESERVED') {
      if (activeUsage.reservationExpiresAt && activeUsage.reservationExpiresAt > input.now) {
        throw new ConflictException({
          message: 'Já existe uma reserva válida do benefício para este evento',
          code: 'CLUB_BENEFIT_RESERVED',
          clubBenefit: { applied: false, reason: 'RESERVED_BY_OTHER_REQUEST' },
        });
      }
      await tx.clubBenefitUsage.updateMany({
        where: { id: activeUsage.id, status: 'RESERVED', activeMarker: true },
        data: {
          status: 'RELEASED',
          activeMarker: null,
          releasedAt: input.now,
          releaseReason: 'RESERVATION_EXPIRED',
        },
      });
    }

    const selected = [...input.items]
      .filter((item) => item.quantity > 0 && item.unitPrice.greaterThan(0))
      .sort((left, right) => {
        const price = right.unitPrice.comparedTo(left.unitPrice);
        if (price !== 0) return price;
        if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
        return left.batchId.localeCompare(right.batchId);
      })[0];

    if (!selected) return { applied: false, reason: 'NO_PAID_TICKETS' };
    if (input.hasCoupon) {
      throw new BadRequestException({
        message: 'O benefício do Clube Outrahora está disponível e não pode ser acumulado com cupom',
        code: 'CLUB_BENEFIT_COUPON_NOT_ALLOWED',
        clubBenefit: { applied: true, reason: 'AVAILABLE' },
      });
    }

    const percentage = new Prisma.Decimal(member.discountPercentage);
    const originalAmount = new Prisma.Decimal(selected.unitPrice);
    const discountAmount = originalAmount
      .mul(percentage)
      .div(100)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    return {
      applied: true,
      reason: 'AVAILABLE',
      clubMemberId: member.id,
      discountPercentage: percentage,
      batchId: selected.batchId,
      batchName: selected.batchName,
      originalAmount,
      discountAmount,
      finalAmount: originalAmount.sub(discountAmount),
    };
  }

  createReservationInTransaction(
    tx: Prisma.TransactionClient,
    decision: ClubBenefitDecision,
    input: { eventId: string; orderId: string; expiresAt: Date; now: Date },
  ) {
    if (!decision.applied || !decision.clubMemberId || !decision.discountPercentage
      || !decision.batchId || !decision.originalAmount || !decision.discountAmount || !decision.finalAmount) {
      return null;
    }
    return tx.clubBenefitUsage.create({
      data: {
        clubMemberId: decision.clubMemberId,
        eventId: input.eventId,
        status: 'RESERVED',
        activeMarker: true,
        discountPercentage: decision.discountPercentage,
        reservedOrderId: input.orderId,
        batchId: decision.batchId,
        originalAmount: decision.originalAmount,
        discountAmount: decision.discountAmount,
        finalAmount: decision.finalAmount,
        reservedAt: input.now,
        reservationExpiresAt: input.expiresAt,
      },
    });
  }

  async confirmInTransaction(
    tx: Prisma.TransactionClient,
    usageId: string,
    orderId: string,
    ticketId: string,
    now: Date,
  ) {
    const claimed = await tx.clubBenefitUsage.updateMany({
      where: {
        id: usageId,
        reservedOrderId: orderId,
        status: 'RESERVED',
        activeMarker: true,
        reservationExpiresAt: { gt: now },
      },
      data: {
        status: 'CONFIRMED',
        confirmedOrderId: orderId,
        ticketId,
        confirmedAt: now,
      },
    });
    if (claimed.count !== 1) {
      throw new ConflictException('A reserva do benefício do Clube não está mais válida');
    }
  }

  releaseForOrderInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
    reason: string,
    now = new Date(),
  ) {
    return tx.clubBenefitUsage.updateMany({
      where: { reservedOrderId: orderId, status: 'RESERVED', activeMarker: true },
      data: {
        status: 'RELEASED',
        activeMarker: null,
        releasedAt: now,
        releaseReason: reason,
      },
    });
  }

  releaseConfirmedForOrderInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
    reason: string,
    now = new Date(),
  ) {
    return tx.clubBenefitUsage.updateMany({
      where: { confirmedOrderId: orderId, status: 'CONFIRMED', activeMarker: true },
      data: {
        status: 'RELEASED',
        activeMarker: null,
        releasedAt: now,
        releaseReason: reason,
      },
    });
  }

  toResponse(decision: ClubBenefitDecision) {
    return {
      applied: decision.applied,
      reason: decision.reason,
      discountPercentage: decision.discountPercentage?.toFixed(2) ?? null,
      batchId: decision.batchId ?? null,
      batchName: decision.batchName ?? null,
      originalAmount: decision.originalAmount?.toFixed(2) ?? null,
      discountAmount: decision.discountAmount?.toFixed(2) ?? null,
      finalAmount: decision.finalAmount?.toFixed(2) ?? null,
      quantityDiscounted: decision.applied ? 1 : 0,
    };
  }
}
