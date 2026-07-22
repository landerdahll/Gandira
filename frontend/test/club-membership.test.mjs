import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/club-membership.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const module = { exports: {} };
new Function('exports', 'module', compiled)(module.exports, module);
const { formatClubDiscountPercentage, shouldShowClubMembershipCard } = module.exports;

test('exibe o card para membro ativo', () => {
  assert.equal(shouldShowClubMembershipCard({ isMember: true, isActive: true }), true);
});

test('oculta o card para não membro', () => {
  assert.equal(shouldShowClubMembershipCard({ isMember: false, isActive: false }), false);
});

test('oculta o card para membro inativo', () => {
  assert.equal(shouldShowClubMembershipCard({ isMember: true, isActive: false }), false);
});

test('formata percentuais no padrão pt-BR', () => {
  assert.equal(formatClubDiscountPercentage('10.00'), '10%');
  assert.equal(formatClubDiscountPercentage('12.50'), '12,5%');
  assert.equal(formatClubDiscountPercentage('15.75'), '15,75%');
});
