import { RefundsService, CANCELLATION_WINDOW_MS, EVENT_CUTOFF_MS } from './refunds.service';

describe('RefundsService eligibility', () => {
  const service = new RefundsService({} as never, {} as never, {} as never, {} as never);
  const now = new Date('2026-07-28T12:00:00.000Z');
  const order = (overrides: any = {}) => ({
    status: 'PAID', createdAt: new Date(now.getTime() - CANCELLATION_WINDOW_MS),
    event: { startDate: new Date(now.getTime() + EVENT_CUTOFF_MS) },
    tickets: [{ status: 'ACTIVE', checkIn: null }], ...overrides,
  });

  it('accepts exact seven-day and 48-hour boundaries', () => expect(service.eligibility(order(), now).eligible).toBe(true));
  it('rejects a purchase older than seven calendar days', () => expect(service.eligibility(order({ createdAt: new Date(now.getTime() - CANCELLATION_WINDOW_MS - 1) }), now).code).toBe('PURCHASE_WINDOW_EXPIRED'));
  it('rejects an event less than 48 hours away', () => expect(service.eligibility(order({ event: { startDate: new Date(now.getTime() + EVENT_CUTOFF_MS - 1) } }), now).code).toBe('EVENT_TOO_CLOSE'));
  it('rejects any checked-in ticket in the order', () => expect(service.eligibility(order({ tickets: [{ status: 'USED', checkIn: {} }] }), now).code).toBe('TICKET_USED'));
  it.each(['REFUND_PENDING', 'REFUNDED', 'REFUND_FAILED'])('rejects status %s', status => expect(service.eligibility(order({ status }), now).eligible).toBe(false));
});
