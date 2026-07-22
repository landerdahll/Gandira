import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/club-checkout.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const module = { exports: {} };
new Function('exports', 'module', compiled)(module.exports, module);
const { getDiscountLabel, canTransferTicket } = module.exports;

test('distingue desconto do Clube e cupom no resumo', () => {
  assert.equal(getDiscountLabel('CLUB'), 'Benefício Clube Outrahora');
  assert.equal(getDiscountLabel('COUPON'), 'Desconto (cupom)');
  assert.equal(getDiscountLabel('NONE'), 'Desconto');
});

test('impede transferência visual do ingresso beneficiado', () => {
  assert.equal(canTransferTicket({ clubBenefitApplied: true }), false);
  assert.equal(canTransferTicket({ clubBenefitApplied: false }), true);
});
