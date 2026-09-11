import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const layout = await readFile(new URL('src/app/layout.tsx', root), 'utf8');
const provider = await readFile(new URL('src/components/providers/theme-provider.tsx', root), 'utf8');
const navbar = await readFile(new URL('src/components/layout/navbar.tsx', root), 'utf8');
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');
const favicon = await readFile(new URL('public/favicon-pago-black.svg', root), 'utf8');
const initScript = layout.match(/const themeInitScript = `([\s\S]*?)`;/)?.[1];

function runThemeInit(savedTheme) {
  const document = { documentElement: { dataset: {}, style: {} } };
  vm.runInNewContext(initScript, {
    localStorage: { getItem: () => savedTheme },
    document,
  });
  return document.documentElement;
}

test('all visitors receive dark before first paint', () => {
  assert.ok(initScript);
  assert.equal(runThemeInit(null).dataset.theme, 'dark');
  assert.equal(runThemeInit(null).style.colorScheme, 'dark');
  assert.match(layout, /<html lang="pt-BR" data-theme="dark"/);
});

test('a saved light preference is replaced with dark', () => {
  assert.equal(runThemeInit('dark').dataset.theme, 'dark');
  assert.equal(runThemeInit('light').dataset.theme, 'dark');
  assert.match(layout, /localStorage\.setItem\('pago-theme', 'dark'\)/);
  assert.match(provider, /localStorage\.setItem\(STORAGE_KEY, 'dark'\)/);
});

test('dark is selected pre-paint and the public toggle is disabled without deleting it', () => {
  assert.doesNotMatch(`${layout}\n${provider}`, /prefers-color-scheme|matchMedia/);
  assert.ok(layout.indexOf('themeInitScript') < layout.indexOf('<body'));
  assert.match(provider, /PUBLIC_THEME_SWITCHING_ENABLED = false/);
  assert.match(navbar, /PUBLIC_THEME_SWITCHING_ENABLED && <ThemeToggle/);
  assert.match(navbar, /theme-toggle-icon--dark/);
  assert.match(navbar, /theme-toggle-icon--light/);
  assert.match(styles, /data-theme='light'.*brand-mark--logo\.brand-mark--on-brand/);
});

test('metadata uses the cache-busted black brand favicon', () => {
  assert.match(layout, /url: '\/favicon-pago-black\.svg\?v=20260728'/);
  assert.match(layout, /shortcut: '\/favicon-pago-black\.svg\?v=20260728'/);
  assert.doesNotMatch(layout, /icon\.svg|icon-blue\.svg/);
  assert.match(favicon, /viewBox="0 0 4047\.16 3172\.4"/);
  assert.match(favicon, /fill(?:=|:)"?#000000/);
  assert.doesNotMatch(favicon, /#72CDFE/i);
});
