import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');
const ticket = await readFile(new URL('src/app/my-tickets/[id]/page.tsx', root), 'utf8');
const users = await readFile(new URL('src/app/admin/users/page.tsx', root), 'utf8');
const club = await readFile(new URL('src/app/admin/clube-outrahora/page.tsx', root), 'utf8');
const transfers = await readFile(new URL('src/app/admin/transfers/page.tsx', root), 'utf8');
const navigation = await readFile(new URL('src/components/admin/admin-navigation.tsx', root), 'utf8');

test('ticket detail header exposes light surface, title and active badge hooks', () => {
  for (const className of [
    'ticket-detail-card',
    'ticket-detail-header',
    'ticket-detail-cover-overlay',
    'ticket-detail-cover-fallback',
    'ticket-detail-title',
    'ticket-detail-status--',
  ]) assert.match(ticket, new RegExp(className));
  assert.match(styles, /\.ticket-detail-status--active/);
  assert.match(styles, /\.ticket-detail-title[\s\S]*?var\(--theme-text\)/);
});

test('master users cover filters, fallback avatars, roles, menus and pagination', () => {
  for (const className of [
    'master-users-panel',
    'master-filter--active',
    'master-filter--inactive',
    'master-user-card',
    'master-user-avatar',
    'master-role-badge',
    'master-role-menu',
    'master-role-menu-item',
    'master-pagination--active',
    'master-pagination--inactive',
  ]) assert.match(users, new RegExp(className));
  assert.match(styles, /\.master-user-avatar[\s\S]*?background: var\(--theme-primary\)/);
  assert.match(styles, /\.master-role-badge[\s\S]*?color: var\(--theme-primary\)/);
});

test('master club listing covers cards, table, rows, badges and detail surfaces', () => {
  for (const className of [
    'master-club-panel',
    'master-club-list',
    'master-club-row',
    'master-club-summary',
    'master-club-usage',
    'master-club-info',
    'master-club-badge',
    'master-club-modal',
  ]) {
    assert.match(club, new RegExp(className));
    assert.match(styles, new RegExp(`\\.${className}`));
  }
  assert.match(styles, /\.master-club-row:hover/);
});

test('master transfers cover filters, search, table, rows, pagination and modal', () => {
  for (const className of [
    'master-transfers-panel',
    'master-transfer-filters',
    'master-transfer-search',
    'master-transfer-table',
    'master-transfer-row',
    'master-transfer-pagination',
    'master-transfer-modal',
  ]) {
    assert.match(transfers, new RegExp(className));
    assert.match(styles, new RegExp(`\\.${className}`));
  }
  assert.match(styles, /\.master-transfer-row:hover/);
});

test('master navigation is scoped and all new overrides are light-only', () => {
  assert.match(navigation, /className="master-navigation"/);
  assert.match(navigation, /master-navigation-link--active/);
  const start = styles.indexOf('/* Light ticket detail */');
  const block = styles.slice(start, styles.indexOf('@layer utilities', start)).replaceAll(/\/\*[\s\S]*?\*\//g, '');
  for (const match of block.matchAll(/([^{}]+)\{/g)) {
    assert.match(match[1].trim(), /^:root\[data-theme='light'\]/);
  }
  for (const token of ['--theme-primary', '--theme-surface', '--theme-border', '--theme-text', '--theme-text-secondary', '--theme-shadow']) {
    assert.match(block, new RegExp(`var\\(${token}\\)`));
  }
});
