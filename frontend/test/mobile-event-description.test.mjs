import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const utility = await readFile(new URL('src/lib/truncate-event-description.ts', root), 'utf8');
const component = await readFile(new URL('src/components/events/event-description.tsx', root), 'utf8');
const page = await readFile(new URL('src/app/events/[slug]/page.tsx', root), 'utf8');
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');

function preview(description, limit = 500, tolerance = 40) {
  const text = description.trim();
  if (text.length <= limit) return { text, truncated: false };
  const maximum = Math.min(text.length, limit + tolerance);
  const forwardWhitespace = text.slice(limit, maximum + 1).search(/\s/);
  let cutAt = forwardWhitespace >= 0 ? limit + forwardWhitespace : -1;
  if (cutAt < 0) {
    const backwardWhitespace = text.slice(0, limit + 1).search(/\s+\S*$/);
    cutAt = backwardWhitespace >= 0 ? backwardWhitespace : limit;
  }
  return { text: `${text.slice(0, cutAt).trimEnd().replace(/[,:;\-–—]+$/, '')}…`, truncated: true };
}

test('keeps descriptions below and exactly at 500 characters complete', () => {
  assert.deepEqual(preview('a'.repeat(499)), { text: 'a'.repeat(499), truncated: false });
  assert.deepEqual(preview('a'.repeat(500)), { text: 'a'.repeat(500), truncated: false });
});

test('truncates long descriptions on a word boundary within the tolerance', () => {
  const result = preview(`${'palavra '.repeat(63)}continuação da descrição muito longa`);
  assert.equal(result.truncated, true);
  assert.match(result.text, /…$/);
  assert.doesNotMatch(result.text, /palav…$/);
});

test('handles a very long token without overflowing the configured preview', () => {
  const result = preview('x'.repeat(2000));
  assert.equal(result.text.length, 501);
  assert.equal(result.truncated, true);
});

test('HTML-like content stays plain React text and is never injected as markup', () => {
  assert.match(component, /\{expanded \? description : preview\.text\}/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML/);
  assert.match(utility, /rendered by React as text/);
});

test('supports expansion, collapse and accessible state without page reload', () => {
  assert.match(component, /useState\(false\)/);
  assert.match(component, /setExpanded\(true\)/);
  assert.match(component, /setExpanded\(false\)/);
  assert.match(component, /aria-expanded=\{expanded\}/);
  assert.match(component, /aria-controls=\{contentId\}/);
  assert.match(component, /Ver menos/);
  assert.match(component, /Ver mais/);
  assert.match(component, /prefers-reduced-motion: reduce/);
});

test('uses the reusable description on every event page and toggles only on mobile', () => {
  assert.match(page, /<EventDescription description=\{event\.description\} \/>/);
  const mobileStart = styles.indexOf('@media (max-width: 768px)');
  const mobileEnd = styles.indexOf('@media (min-width: 600px)', mobileStart);
  const mobile = styles.slice(mobileStart, mobileEnd);
  assert.match(mobile, /event-description__desktop-text \{ display: none; \}/);
  assert.match(mobile, /event-description__mobile-text \{ display: inline; \}/);
  assert.match(mobile, /event-description__toggle[\s\S]*?display: inline-flex/);
  assert.match(styles.slice(0, mobileStart), /event-description__mobile-text,[\s\S]*?event-description__toggle \{ display: none; \}/);
});
