import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');
const club = await readFile(new URL('src/app/admin/clube-outrahora/page.tsx', root), 'utf8');

test('Alte Haas Grotesk is bundled locally in WOFF2 regular and bold cuts', async () => {
  for (const file of [
    'public/fonts/alte-haas-grotesk/alte-haas-grotesk-regular.woff2',
    'public/fonts/alte-haas-grotesk/alte-haas-grotesk-bold.woff2',
  ]) {
    const font = await stat(new URL(file, root));
    assert.ok(font.size > 0);
  }

  assert.match(styles, /@font-face\s*{[^}]*font-family:\s*'Alte Haas Grotesk';[^}]*format\('woff2'\)/s);
});

test('only light changes the theme font while dark retains Space Grotesk', () => {
  assert.match(styles, /:root,\s*:root\[data-theme='dark'\]\s*{[^}]*--theme-font-family:\s*var\(--font-space\), system-ui, sans-serif;/s);
  assert.match(styles, /:root\[data-theme='light'\]\s*{[^}]*--theme-font-family:\s*'Alte Haas Grotesk', sans-serif;/s);
  assert.match(styles, /body\s*{\s*font-family:\s*var\(--theme-font-family\);\s*}/);
});

test('club create button is centered and only narrowed in light mode', () => {
  assert.match(club, /className="master-club-create-button"/);
  assert.match(styles, /:root\[data-theme='light'\] \.master-club-create-button\s*{[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*padding-right:\s*13px !important;[^}]*padding-left:\s*13px !important;[^}]*text-align:\s*center;/s);
});
