import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const layout = await readFile(new URL('src/app/layout.tsx', root), 'utf8');
const provider = await readFile(new URL('src/components/providers/theme-provider.tsx', root), 'utf8');
const navbar = await readFile(new URL('src/components/layout/navbar.tsx', root), 'utf8');
const styles = await readFile(new URL('src/app/globals.css', root), 'utf8');
const initScript = layout.match(/const themeInitScript = `([\s\S]*?)`;/)?.[1];

function runThemeInit(savedTheme) {
  const document = { documentElement: { dataset: {}, style: {} } };
  vm.runInNewContext(initScript, {
    localStorage: { getItem: () => savedTheme },
    document,
  });
  return document.documentElement;
}

test('new visitors receive light before first paint', () => {
  assert.ok(initScript);
  assert.equal(runThemeInit(null).dataset.theme, 'light');
  assert.equal(runThemeInit(null).style.colorScheme, 'light');
  assert.match(layout, /<html lang="pt-BR" data-theme="light"/);
});

test('saved dark and light preferences survive refresh', () => {
  assert.equal(runThemeInit('dark').dataset.theme, 'dark');
  assert.equal(runThemeInit('light').dataset.theme, 'light');
  assert.match(provider, /localStorage\.setItem\(STORAGE_KEY, nextTheme\)/);
  assert.match(provider, /savedTheme === 'dark' \? 'dark' : 'light'/);
});

test('theme is selected pre-paint without system preference or logo flash', () => {
  assert.doesNotMatch(`${layout}\n${provider}`, /prefers-color-scheme|matchMedia/);
  assert.ok(layout.indexOf('themeInitScript') < layout.indexOf('<body'));
  assert.match(navbar, /theme-toggle-icon--dark/);
  assert.match(navbar, /theme-toggle-icon--light/);
  assert.match(styles, /data-theme='dark'.*theme-toggle-icon--dark/);
  assert.match(styles, /data-theme='light'.*theme-toggle-icon--light/);
  assert.match(styles, /data-theme='light'.*brand-mark--logo\.brand-mark--on-brand/);
});
