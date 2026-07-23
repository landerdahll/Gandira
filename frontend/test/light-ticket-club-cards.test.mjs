import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');
const batches = await readFile(new URL('src/components/checkout/batch-selector.tsx', root), 'utf8');
const profile = await readFile(new URL('src/app/profile/page.tsx', root), 'utf8');

test('ticket batches expose available, selected, future and sold-out visual states', () => {
  for (const className of [
    'ticket-batch-card--current',
    'ticket-batch-card--future',
    'ticket-batch-card--sold-out',
    'ticket-batch-badge--available',
    'ticket-batch-badge--future',
    'ticket-batch-badge--sold-out',
  ]) {
    assert.match(batches, new RegExp(className));
    assert.match(styles, new RegExp(`\\.${className}`));
  }
});

test('ticket batch text, dividers and quantity controls use light tokens', () => {
  for (const className of [
    'ticket-batch-title',
    'ticket-batch-price',
    'ticket-batch-description',
    'ticket-batch-fees',
    'ticket-batch-quantity',
    'ticket-batch-quantity-label',
    'ticket-batch-quantity-count',
    'ticket-batch-quantity-button',
    'ticket-batch-future-note',
  ]) {
    assert.match(batches, new RegExp(className));
    assert.match(styles, new RegExp(`\\.${className}`));
  }
  assert.match(styles, /\.ticket-batch-quantity-button:not\(:disabled\):hover/);
  assert.match(styles, /\.ticket-batch-quantity-button:disabled/);
});

test('club membership card exposes readable light-theme regions', () => {
  for (const className of [
    'club-membership-card',
    'club-membership-icon',
    'club-membership-title',
    'club-membership-status',
    'club-membership-discount',
    'club-membership-benefits',
    'club-membership-benefit',
  ]) {
    assert.match(profile, new RegExp(className));
    assert.match(styles, new RegExp(`\\.${className}`));
  }
});

test('ticket and club overrides are light-only and token-based', () => {
  const start = styles.indexOf('/* Light ticket batches */');
  const block = styles.slice(start, styles.indexOf('@layer utilities', start)).replaceAll(/\/\*[\s\S]*?\*\//g, '');

  for (const match of block.matchAll(/([^{}]+)\{/g)) {
    assert.match(match[1].trim(), /^:root\[data-theme='light'\]/);
  }

  for (const token of ['--theme-primary', '--theme-surface', '--theme-border', '--theme-text', '--theme-shadow']) {
    assert.match(block, new RegExp(`var\\(${token}\\)`));
  }
});
