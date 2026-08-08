import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const page = await readFile(new URL('src/app/events/[slug]/page.tsx', root), 'utf8');
const mapLinks = await readFile(new URL('src/components/events/event-map-links.tsx', root), 'utf8');
const mobilePurchaseCta = await readFile(new URL('src/components/events/mobile-purchase-cta.tsx', root), 'utf8');
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');

test('keeps the original dark hero and scopes the premium redesign to light mode', () => {
  assert.match(page, /const heroImage = event\.coverImage \?\? event\.bannerImage;/);
  assert.match(page, /event-cover event-hero-dark/);
  assert.match(page, /event-hero-light/);
  assert.match(styles, /\.event-hero-light \{ display: none; \}/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-hero-dark \{ display: none; \}/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-hero-light\s*\{/);
  assert.doesNotMatch(styles, /:root\[data-theme='dark'\] \.event-hero/);
  assert.doesNotMatch(page, /event-hero-light__eyebrow/);
  assert.doesNotMatch(page, />Antes de ir</);
});

test('renders venue routes, organization identity and same-organization related events', () => {
  assert.match(page, /Apresentado por/);
  assert.match(page, /Outros eventos de \$\{event\.organization\.name\}/);
  assert.match(page, /<EventMapLinks query={mapQuery}/);
  assert.match(mapLinks, /google\.com\/maps\/search\/\?api=1&query=/);
  assert.match(mapLinks, /geo:0,0\?q=/);
  assert.match(mapLinks, /maps\.apple\.com\/\?q=/);
  assert.doesNotMatch(mapLinks, /waze/i);
  assert.match(mapLinks, /target="_blank" rel="noopener noreferrer"/);
});

test('light mobile layout is single-column, keeps the purchase target visible and prevents oversized content grids', () => {
  assert.match(styles, /@media \(max-width: 768px\)[\s\S]*?:root\[data-theme='light'\] \.event-detail-grid \{ grid-template-columns: minmax\(0, 1fr\) !important; gap: 30px !important; \}/);
  assert.match(styles, /\.purchase-widget-sticky \{[\s\S]*?position: static !important;[\s\S]*?width: 100%;[\s\S]*?max-width: 100%;/);
  assert.match(styles, /\.purchase-widget-sticky \{[\s\S]*?scroll-margin-top: 28px;/);
  assert.match(styles, /\.event-detail-grid > \* \{ min-width: 0; \}/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-important-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(mobilePurchaseCta, /IntersectionObserver/);
  assert.match(mobilePurchaseCta, /scrollIntoView\(\{ behavior: 'smooth'/);
  assert.match(styles, /\.event-mobile-purchase-cta \{[\s\S]*?position: fixed;[\s\S]*?env\(safe-area-inset-bottom\)/);
  assert.match(styles, /\.featured-buy-button \{[\s\S]*?width: 68%;[\s\S]*?margin-right: auto;[\s\S]*?margin-left: auto !important;/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-hero-light \{[\s\S]*?display: block;[\s\S]*?height: auto;[\s\S]*?max-height: none;[\s\S]*?aspect-ratio: auto;[\s\S]*?overflow: visible;/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-hero-light__image \{[\s\S]*?position: relative;[\s\S]*?min-width: 0;[\s\S]*?width: 100%;[\s\S]*?max-width: 100%;[\s\S]*?height: auto;[\s\S]*?max-height: none;[\s\S]*?aspect-ratio: auto;[\s\S]*?object-fit: contain;/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-hero-light__content \{ position: absolute; right: 0; bottom: 0; left: 0;/);
  assert.match(styles, /:root\[data-theme='light'\] \.event-hero-light--fallback \{ min-height: min\(108vw, 480px\); \}/);
});
