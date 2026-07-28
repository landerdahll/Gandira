import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ticket = readFileSync(new URL('../src/app/my-tickets/[id]/page.tsx', import.meta.url), 'utf8');
const confirmation = readFileSync(new URL('../src/components/refunds/cancel-ticket-modal.tsx', import.meta.url), 'utf8');
const policy = readFileSync(new URL('../src/components/refunds/cancellation-policy-modal.tsx', import.meta.url), 'utf8');

test('ticket cancellation is driven by backend eligibility', () => {
  assert.match(ticket, /ticket\.cancellation\?\.eligible/);
  assert.match(ticket, /refundsApi\.cancel\(ticket\.orderId, true\)/);
});
test('confirmation requires policy acceptance and explains permanent QR invalidation', () => {
  assert.match(confirmation, /disabled={!accepted\|\|busy}/);
  assert.match(confirmation, /QR Codes deixarão de permitir acesso/);
  assert.match(policy, /Após a confirmação do cancelamento não será possível reativar/);
});
