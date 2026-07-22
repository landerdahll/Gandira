import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { withSerializableRetry } from '../../common/utils/serializable-retry.util';
import { PrismaService } from '../../prisma/prisma.service';

export type OrderExpirationResult = 'EXPIRED' | 'ALREADY_EXPIRED' | 'NOT_PENDING';

@Injectable()
export class OrderExpirationService {
  constructor(private readonly prisma: PrismaService) {}

  expirePendingOrder(orderId: string, now = new Date()) {
    return withSerializableRetry(() => this.prisma.$transaction(
      (tx) => this.expirePendingOrderInTransaction(tx, orderId, now),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ));
  }

  async expirePendingOrderInTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
    now = new Date(),
  ): Promise<OrderExpirationResult> {
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
    return 'EXPIRED';
  }
}
