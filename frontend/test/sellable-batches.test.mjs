import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/sellable-batches.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { getLowestSellableBatchPrice, isBatchSellable } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
const now = new Date('2026-08-07T18:00:00.000Z');

function batch(overrides = {}) {
  return {
    status: 'ACTIVE', quantity: 100, sold: 0, price: 50,
    startsAt: '2026-08-01T00:00:00.000Z', endsAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  };
}

test('CTA price ignores a cheaper sold-out batch and uses the lowest currently sellable batch', () => {
  const batches = [
    batch({ price: 40, quantity: 100, sold: 100 }),
    batch({ price: 50 }),
  ];

  assert.equal(isBatchSellable(batches[0], now), false);
  assert.equal(isBatchSellable(batches[1], now), true);
  assert.equal(getLowestSellableBatchPrice(batches, now), 50);
});

test('CTA price excludes inactive and out-of-window batches', () => {
  const batches = [
    batch({ price: 30, status: 'SOLD_OUT' }),
    batch({ price: 35, endsAt: '2026-08-07T17:59:59.000Z' }),
    batch({ price: 40, startsAt: '2026-08-07T18:00:01.000Z' }),
    batch({ price: 55 }),
  ];

  assert.equal(getLowestSellableBatchPrice(batches, now), 55);
});

test('CTA has no price when no batch is currently sellable', () => {
  assert.equal(getLowestSellableBatchPrice([batch({ quantity: 10, sold: 10 })], now), null);
});
