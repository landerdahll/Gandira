export interface SellableBatch {
  status: string;
  quantity: number;
  sold: number;
  startsAt: string | Date;
  endsAt: string | Date;
  price: number | string;
}

export function isBatchSellable(batch: SellableBatch, now = new Date()) {
  const startsAt = new Date(batch.startsAt);
  const endsAt = new Date(batch.endsAt);
  return batch.status === 'ACTIVE'
    && batch.quantity - batch.sold > 0
    && !Number.isNaN(startsAt.getTime())
    && !Number.isNaN(endsAt.getTime())
    && startsAt <= now
    && endsAt >= now;
}

export function getLowestSellableBatchPrice(batches: SellableBatch[], now = new Date()) {
  const prices = batches
    .filter(batch => isBatchSellable(batch, now))
    .map(batch => Number(batch.price))
    .filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : null;
}
