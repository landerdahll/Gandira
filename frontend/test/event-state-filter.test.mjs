import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const home = await readFile(new URL('src/app/page.tsx', root), 'utf8');
const selector = await readFile(new URL('src/components/events/event-state-selector.tsx', root), 'utf8');
const states = await readFile(new URL('src/lib/event-states.ts', root), 'utf8');
const locationRoute = await readFile(new URL('src/app/api/location/state/route.ts', root), 'utf8');
const newEvent = await readFile(new URL('src/app/producer/events/new/page.tsx', root), 'utf8');
const editEvent = await readFile(new URL('src/app/producer/events/[id]/edit/page.tsx', root), 'utf8');

test('home state filter supports the required regions and filters every event group', () => {
  assert.match(states, /\['RS', 'SC', 'PR', 'SP', 'RJ'\]/);
  assert.match(home, /getPast\(apiState\)/);
  assert.match(home, /getFeatured\(apiState\)/);
  assert.match(home, /Ainda não temos eventos programados em/);
});

test('manual preference wins and approximate detection never requests GPS', () => {
  assert.match(selector, /localStorage\.getItem\(EVENT_STATE_PREFERENCE_KEY\)/);
  assert.match(selector, /localStorage\.setItem\(EVENT_STATE_PREFERENCE_KEY, state\)/);
  assert.match(selector, /fetch\('\/api\/location\/state'/);
  assert.doesNotMatch(selector, /navigator\.geolocation/);
  assert.match(locationRoute, /x-vercel-ip-country-region/);
  assert.match(locationRoute, /ipapi\.co/);
});

test('event creation and editing expose state selects instead of free text', () => {
  for (const page of [newEvent, editEvent]) {
    assert.match(page, /<select aria-label="UF"/);
    assert.match(page, /\['RS', 'SC', 'PR', 'SP', 'RJ'\]/);
    assert.doesNotMatch(page, /maxLength=\{2\} value=\{form\.state\}/);
  }
});
