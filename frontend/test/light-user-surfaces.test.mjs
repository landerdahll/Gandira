import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');
const navbar = await readFile(new URL('src/components/layout/navbar.tsx', root), 'utf8');
const dashboard = await readFile(new URL('src/app/producer/dashboard/page.tsx', root), 'utf8');
const profile = await readFile(new URL('src/app/profile/page.tsx', root), 'utf8');
const tickets = await readFile(new URL('src/app/my-tickets/page.tsx', root), 'utf8');

test('user dropdown uses a light surface for normal and hover states', () => {
  assert.match(navbar, /className="user-dropdown"/);
  assert.match(navbar, /className="user-dropdown-item"/);
  assert.match(navbar, /className="user-dropdown-logout"/);
  assert.match(styles, /data-theme='light'.*user-dropdown-item:hover/);
  assert.match(styles, /background: color-mix\(in srgb, var\(--theme-primary\) 10%, var\(--theme-surface\)\) !important/);
});

test('published and role badges share the soft primary treatment', () => {
  assert.match(dashboard, /event-status-badge--\$\{event\.status\.toLowerCase\(\)\}/);
  assert.match(profile, /className="profile-role-badge"/);
  assert.match(styles, /\.event-status-badge--published,[\s\S]*?\.profile-role-badge/);
});

test('profile avatar has light-theme image and fallback treatments', () => {
  assert.match(profile, /profile-avatar--image/);
  assert.match(profile, /profile-avatar--fallback/);
  assert.match(styles, /\.profile-avatar--fallback[\s\S]*?background: var\(--theme-primary\) !important/);
  assert.match(styles, /\.profile-avatar--fallback[\s\S]*?color: #fff !important/);
});

test('ticket filters cover active, inactive, count and hover contrast', () => {
  assert.match(tickets, /ticket-filter--active/);
  assert.match(tickets, /ticket-filter--inactive/);
  assert.match(tickets, /className="ticket-filter-count"/);
  for (const selector of [
    'ticket-filter--active',
    'ticket-filter--active .ticket-filter-count',
    'ticket-filter--inactive',
    'ticket-filter--inactive .ticket-filter-count',
    'ticket-filter--inactive:hover',
  ]) {
    assert.match(styles, new RegExp(`data-theme='light'\\] \\.${selector.replace('.', '\\.').replace(':', '\\:')}`));
  }
});

test('new visual overrides are scoped to light and reuse theme tokens', () => {
  const start = styles.indexOf('/* Light user surfaces */');
  const block = styles.slice(start, styles.indexOf('@layer utilities', start)).replaceAll(/\/\*[\s\S]*?\*\//g, '');
  for (const match of block.matchAll(/([^{}]+)\{/g)) {
    assert.match(match[1].trim(), /^:root\[data-theme='light'\]/);
  }
  assert.doesNotMatch(block, /#(?:0{3,6}|1[0-9a-f]{2,5}|2[0-9a-f]{2,5})\b/i);
});
