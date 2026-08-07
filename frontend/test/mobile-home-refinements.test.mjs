import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');
const featured = await readFile(new URL('src/components/events/featured-event-card.tsx', root), 'utf8');

test('mobile-only image ratios implement the requested height refinements', () => {
  const start = styles.indexOf('@media (max-width: 768px)');
  const end = styles.indexOf('@media (min-width: 600px)', start);
  const mobile = styles.slice(start, end);
  assert.match(mobile, /compact-event-card__media \{ aspect-ratio: 4 \/ 5/);
  assert.match(mobile, /featured-card-img \{ aspect-ratio: 7 \/ 3 !important/);
  assert.match(styles.slice(0, styles.indexOf('@media (max-width: 768px)')), /aspect-ratio: 4 \/ 5/);
});

test('featured description is clamped to two lines and footer spacing is halved on mobile', () => {
  assert.match(featured, /className="featured-card-description"/);
  assert.match(styles, /featured-card-description[\s\S]*?-webkit-line-clamp: 2/);
  assert.match(styles, /featured-card-footer \{ margin-top: 14px !important; \}/);
});
