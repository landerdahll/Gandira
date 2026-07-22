"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderExpirationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const serializable_retry_util_1 = require("../../common/utils/serializable-retry.util");
const prisma_service_1 = require("../../prisma/prisma.service");
const club_benefits_service_1 = require("../club-benefits/club-benefits.service");
let OrderExpirationService = class OrderExpirationService {
    constructor(prisma, clubBenefits) {
        this.prisma = prisma;
        this.clubBenefits = clubBenefits;
    }
    expirePendingOrder(orderId, now = new Date()) {
        return (0, serializable_retry_util_1.withSerializableRetry)(() => this.prisma.$transaction((tx) => this.expirePendingOrderInTransaction(tx, orderId, now), { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }));
    }
    async expirePendingOrderInTransaction(tx, orderId, now = new Date()) {
        const claimed = await tx.order.updateMany({
            where: { id: orderId, status: 'PENDING', expiresAt: { lte: now } },
            data: { status: 'EXPIRED' },
        });
        if (claimed.count !== 1) {
            const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } });
            return order?.status === 'EXPIRED' ? 'ALREADY_EXPIRED' : 'NOT_PENDING';
        }
        const items = await tx.orderItem.findMany({ where: { orderId }, select: { batchId: true, quantity: true } });
        for (const item of items) {
            await tx.batch.update({
                where: { id: item.batchId },
                data: { sold: { decrement: item.quantity }, status: 'ACTIVE' },
            });
        }
        await this.clubBenefits.releaseForOrderInTransaction(tx, orderId, 'ORDER_EXPIRED', now);
        return 'EXPIRED';
    }
    cancelPendingOrder(orderId, reason, now = new Date()) {
        return (0, serializable_retry_util_1.withSerializableRetry)(() => this.prisma.$transaction(async (tx) => {
            const claimed = await tx.order.updateMany({
                where: { id: orderId, status: 'PENDING' },
                data: { status: 'CANCELLED', cancelledAt: now, cancelReason: reason },
            });
            if (claimed.count !== 1)
                return false;
            const items = await tx.orderItem.findMany({ where: { orderId }, select: { batchId: true, quantity: true } });
            for (const item of items) {
                await tx.batch.update({
                    where: { id: item.batchId },
                    data: { sold: { decrement: item.quantity }, status: 'ACTIVE' },
                });
            }
            await this.clubBenefits.releaseForOrderInTransaction(tx, orderId, reason, now);
            return true;
        }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }));
    }
};
exports.OrderExpirationService = OrderExpirationService;
exports.OrderExpirationService = OrderExpirationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        club_benefits_service_1.ClubBenefitsService])
], OrderExpirationService);
//# sourceMappingURL=order-expiration.service.js.map