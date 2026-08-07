import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const page = await readFile(new URL('src/app/events/[slug]/page.tsx', root), 'utf8');
const mapLinks = await readFile(new URL('src/components/events/event-map-links.tsx', root), 'utf8');
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');

test('keeps the original dark hero and scopes the premium redesign to light mode', () => {
  assert.match(page, /event-cover event-hero-dark/);
  assert.match(page, /event-hero-light/);
  assert.match(styles, /\.event-hero-light \{ display: none; \}/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-hero-dark \{ display: none; \}/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-hero-light\s*\{/);
  assert.doesNotMatch(styles, /:root\[data-theme='dark'\] \.event-hero/);
});

test('renders venue routes, organization identity and same-organization related events', () => {
  assert.match(page, /Apresentado por/);
  assert.match(page, /Outros eventos de \$\{event\.organization\.name\}/);
  assert.match(page, /<EventMapLinks query={mapQuery}/);
  assert.match(mapLinks, /google\.com\/maps\/search\/\?api=1&query=/);
  assert.match(mapLinks, /waze\.com\/ul\?q=/);
  assert.match(mapLinks, /target="_blank" rel="noopener noreferrer"/);
});

test('light mobile layout is single-column, exposes Waze and prevents oversized content grids', () => {
  assert.match(styles, /@media \(max-width: 768px\)[\s\S]*?:root\[data-theme='light'\] \.event-detail-grid \{ gap: 30px !important; \}/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-important-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-map-button--waze \{ display: inline-flex; \}/);
});
