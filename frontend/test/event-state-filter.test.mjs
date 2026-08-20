import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const home = await readFile(new URL('src/app/page.tsx', root), 'utf8');
const selector = await readFile(new URL('src/components/events/event-state-selector.tsx', root), 'utf8');
const states = await readFile(new URL('src/lib/event-states.ts', root), 'utf8');
const newEvent = await readFile(new URL('src/app/producer/events/new/page.tsx', root), 'utf8');
const editEvent = await readFile(new URL('src/app/producer/events/[id]/edit/page.tsx', root), 'utf8');

test('home state filter supports the required regions and filters every event group', () => {
  assert.match(states, /\['RS', 'SC', 'PR', 'SP', 'RJ'\]/);
  assert.match(home, /getPast\(apiState\)/);
  assert.match(home, /getFeatured\(apiState\)/);
  assert.match(home, /Ainda não temos eventos programados em/);
});

test('manual cookie wins over Vercel region and is mirrored to local storage', () => {
  assert.match(home, /savedState \?\? detectedState/);
  assert.match(home, /x-vercel-ip-country/);
  assert.match(home, /x-vercel-ip-country-region/);
  assert.match(home, /country === 'BR'/);
  assert.match(selector, /document\.cookie =/);
  assert.match(selector, /localStorage\.setItem\(EVENT_STATE_PREFERENCE_KEY, state\)/);
  assert.match(states, /ALL_EVENT_STATES_COOKIE_VALUE = 'TODOS'/);
  assert.doesNotMatch(selector, /navigator\.geolocation/);
  assert.doesNotMatch(`${home}\n${selector}`, /ipapi\.co|\/api\/location\/state/);
});

test('external IP geolocation route was removed', async () => {
  await assert.rejects(access(new URL('src/app/api/location/state/route.ts', root)));
});

test('event creation and editing expose state selects instead of free text', () => {
  for (const page of [newEvent, editEvent]) {
    assert.match(page, /<select aria-label="UF"/);
    assert.match(page, /\['RS', 'SC', 'PR', 'SP', 'RJ'\]/);
    assert.doesNotMatch(page, /maxLength=\{2\} value=\{form\.state\}/);
  }
});
