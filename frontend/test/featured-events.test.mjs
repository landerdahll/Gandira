import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const home = await readFile(new URL('src/app/page.tsx', root), 'utf8');
const card = await readFile(new URL('src/components/events/featured-event-card.tsx', root), 'utf8');
const api = await readFile(new URL('src/lib/api.ts', root), 'utf8');
const adminNavigation = await readFile(new URL('src/components/admin/admin-navigation.tsx', root), 'utf8');
const newEvent = await readFile(new URL('src/app/producer/events/new/page.tsx', root), 'utf8');
const editEvent = await readFile(new URL('src/app/producer/events/[id]/edit/page.tsx', root), 'utf8');

test('home obtains its feature from the dedicated priority endpoint', () => {
  assert.match(api, /featured: \(\) => api\.get\('\/events\/featured'\)/);
  assert.match(home, /eventsApi\.featured\(\)/);
  assert.match(home, /upcomingEvents\.filter\(\(event: any\) => event\.id !== featured\.id\)/);
  assert.match(home, /pastEvents\.filter\(\(event: any\) => event\.id !== featured\.id\)/);
});

test('featured card prefers the ultrawide banner and falls back to the cover', () => {
  assert.match(card, /event\.bannerImage \|\| event\.coverImage/);
  assert.match(card, /aspectRatio: '7 \/ 3'/);
  assert.match(card, /objectFit: 'cover'/);
  assert.match(card, /objectPosition: 'center'/);
  assert.match(card, /className="featured-card-footer"/);
  assert.match(card, /flexDirection: 'column'/);
});

test('master events and banner fields are wired into the UI', () => {
  assert.match(adminNavigation, /href: '\/admin\/events', label: 'Eventos'/);
  assert.match(api, /setFeatured: \(id: string, featured: boolean\)/);
  assert.match(newEvent, /EventBannerField value=\{form\.bannerImage\}/);
  assert.match(editEvent, /EventBannerField value=\{form\.bannerImage\}/);
});
