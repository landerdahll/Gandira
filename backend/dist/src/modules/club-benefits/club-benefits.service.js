"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClubBenefitsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let ClubBenefitsService = class ClubBenefitsService {
    async evaluateInTransaction(tx, input) {
        const user = await tx.user.findUnique({ where: { id: input.userId }, select: { email: true } });
        if (!user)
            return { applied: false, reason: 'NOT_MEMBER' };
        const normalizedEmail = user.email.trim().toLowerCase();
        const member = await tx.clubMember.findUnique({ where: { email: normalizedEmail } });
        if (!member)
            return { applied: false, reason: 'NOT_MEMBER' };
        if (!member.isActive)
            return { applied: false, reason: 'INACTIVE_MEMBER' };
        const activeUsage = await tx.clubBenefitUsage.findFirst({
            where: { clubMemberId: member.id, eventId: input.eventId, activeMarker: true },
            orderBy: { createdAt: 'desc' },
        });
        if (activeUsage?.status === 'CONFIRMED') {
            return { applied: false, reason: 'ALREADY_USED' };
        }
        if (activeUsage?.status === 'RESERVED') {
            if (activeUsage.reservationExpiresAt && activeUsage.reservationExpiresAt > input.now) {
                throw new common_1.ConflictException({
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
            if (price !== 0)
                return price;
            if (left.sortOrder !== right.sortOrder)
                return left.sortOrder - right.sortOrder;
            return left.batchId.localeCompare(right.batchId);
        })[0];
        if (!selected)
            return { applied: false, reason: 'NO_PAID_TICKETS' };
        if (input.hasCoupon) {
            throw new common_1.BadRequestException({
                message: 'O benefício do Clube Outrahora está disponível e não pode ser acumulado com cupom',
                code: 'CLUB_BENEFIT_COUPON_NOT_ALLOWED',
                clubBenefit: { applied: true, reason: 'AVAILABLE' },
            });
        }
        const percentage = new client_1.Prisma.Decimal(member.discountPercentage);
        const originalAmount = new client_1.Prisma.Decimal(selected.unitPrice);
        const discountAmount = originalAmount
            .mul(percentage)
            .div(100)
            .toDecimalPlaces(2, client_1.Prisma.Decimal.ROUND_HALF_UP);
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
    createReservationInTransaction(tx, decision, input) {
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
    async confirmInTransaction(tx, usageId, orderId, ticketId, now) {
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
            throw new common_1.ConflictException('A reserva do benefício do Clube não está mais válida');
        }
    }
    releaseForOrderInTransaction(tx, orderId, reason, now = new Date()) {
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
    releaseConfirmedForOrderInTransaction(tx, orderId, reason, now = new Date()) {
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
    toResponse(decision) {
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
};
exports.ClubBenefitsService = ClubBenefitsService;
exports.ClubBenefitsService = ClubBenefitsService = __decorate([
    (0, common_1.Injectable)()
], ClubBenefitsService);
//# sourceMappingURL=club-benefits.service.js.map