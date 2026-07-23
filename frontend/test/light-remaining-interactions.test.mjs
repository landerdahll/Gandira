import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');
const batches = await readFile(new URL('src/components/checkout/batch-selector.tsx', root), 'utf8');
const tickets = await readFile(new URL('src/app/my-tickets/page.tsx', root), 'utf8');
const checkin = await readFile(new URL('src/app/(staff)/checkin/page.tsx', root), 'utf8');

test('club coupon benefit uses a secondary light information surface', () => {
  assert.match(batches, /className="club-coupon-benefit"/);
  assert.match(batches, /className="club-coupon-benefit-title"/);
  assert.match(batches, /className="club-coupon-benefit-description"/);
  assert.match(styles, /data-theme='light'.*\.club-coupon-benefit/);
  assert.match(styles, /\.club-coupon-benefit-description[\s\S]*?var\(--theme-text-secondary\)/);
});

test('ticket cards keep readable light hover content across statuses', () => {
  assert.match(tickets, /className="my-ticket-card"/);
  assert.match(tickets, /className="my-ticket-card-title"/);
  assert.match(tickets, /className="my-ticket-card-meta"/);
  assert.match(styles, /data-theme='light'.*\.my-ticket-card:hover/);
  assert.match(styles, /\.my-ticket-card:hover :is\([\s\S]*?\.my-ticket-card-meta \*/);
});

test('check-in event cards use light hover text and icon treatments', () => {
  assert.match(checkin, /className="checkin-event-card"/);
  assert.match(checkin, /className="checkin-event-title"/);
  assert.match(checkin, /className="checkin-event-meta"/);
  assert.match(checkin, /className="checkin-event-arrow"/);
  assert.match(styles, /data-theme='light'.*\.checkin-event-card:hover/);
});

test('remaining interaction overrides are light-only and token-based', () => {
  const start = styles.indexOf('/* Remaining light interactions */');
  const block = styles.slice(start, styles.indexOf('@layer utilities', start)).replaceAll(/\/\*[\s\S]*?\*\//g, '');
  for (const match of block.matchAll(/([^{}]+)\{/g)) {
    assert.match(match[1].trim(), /^:root\[data-theme='light'\]/);
  }
  for (const token of ['--theme-primary', '--theme-surface', '--theme-border', '--theme-text']) {
    assert.match(block, new RegExp(`var\\(${token}\\)`));
  }
});
