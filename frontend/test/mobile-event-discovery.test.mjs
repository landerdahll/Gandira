import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const home = await readFile(new URL('src/app/page.tsx', root), 'utf8');
const carousel = await readFile(new URL('src/components/events/event-carousel.tsx', root), 'utf8');
const card = await readFile(new URL('src/components/events/event-card.tsx', root), 'utf8');
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');
const homeStyles = await readFile(new URL('src/app/public-home.css', root), 'utf8');

test('upcoming and past sections share the compact carousel without changing featured', () => {
  assert.match(home, /<FeaturedEventCard event={featured}/);
  assert.match(home, /<EventCarousel title="Próximos eventos" events={rest}/);
  assert.match(home, /<EventCarousel title="Eventos passados" events={visiblePastEvents} kind="past"/);
});

test('mobile discovery keeps every event visible in compact two-column grids', () => {
  assert.match(styles, /@media \(max-width: 768px\)[\s\S]*?\.event-carousel\s*{[\s\S]*?overflow-x: auto;[\s\S]*?scroll-snap-type: inline mandatory;/);
  assert.match(homeStyles, /pago-home \.event-carousel[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(homeStyles, /event-carousel--past[\s\S]*?calc\(\(100% - 50px\) \/ 2\)/);
  assert.match(styles, /aspect-ratio: 4 \/ 5/);
  assert.match(styles, /scrollbar-width: none/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test('cards keep essential content concise and suppress accidental drag navigation', () => {
  assert.match(card, /compact-event-card__title/);
  assert.match(styles, /-webkit-line-clamp: 2/);
  assert.match(styles, /text-overflow: ellipsis/);
  assert.match(card, /loading="lazy"/);
  assert.match(card, /decoding="async"/);
  assert.match(carousel, /if \(dragged\.current\).*event\.preventDefault\(\)/s);
  assert.match(carousel, /aria-roledescription="carrossel"/);
  assert.match(carousel, /tabIndex={0}/);
});
