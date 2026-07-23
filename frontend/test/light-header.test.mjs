import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const navbar = await readFile(new URL('../src/components/layout/navbar.tsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const brandMark = await readFile(new URL('../src/components/brand/brand-mark.tsx', import.meta.url), 'utf8');

test('light header covers logged-out and logged-in desktop controls', () => {
  for (const className of [
    'nav-events-link',
    'nav-login-link',
    'nav-primary-action',
    'nav-user-button',
    'nav-divider',
  ]) {
    assert.match(navbar, new RegExp(`className="${className}"`));
    assert.match(styles, new RegExp(`\\.${className}`));
  }
});

test('light header covers logged-out and logged-in mobile controls', () => {
  assert.match(navbar, /className="nav-mobile"/);
  assert.match(navbar, /className="nav-mobile-login"/);
  assert.match(navbar, /className="nav-menu-toggle"/);
  assert.match(navbar, /<Avatar user=\{user\} size=\{34\} \/>/);
  assert.match(styles, /theme-navbar \.nav-mobile-login/);
  assert.match(styles, /\.nav-menu-toggle/);
});

test('header refinements are scoped exclusively to light theme', () => {
  const start = styles.indexOf('*/', styles.indexOf('/* Light header contrast.')) + 2;
  const refinementBlock = styles
    .slice(start, styles.indexOf('@layer utilities', start))
    .replaceAll(/\/\*[\s\S]*?\*\//g, '');
  const selectors = refinementBlock.matchAll(/([^{}]+)\{/g);

  for (const match of selectors) {
    const selector = match[1].trim();
    if (selector.startsWith('@')) continue;
    assert.match(selector, /^:root\[data-theme='light'\]/);
  }
});

test('logo is selected by pre-paint theme CSS without waiting for hydration', () => {
  assert.doesNotMatch(brandMark, /useTheme|useEffect|useState/);
  assert.match(brandMark, /src=\{`\/\$\{kind\}-blue\.svg`\}/);
  assert.match(styles, /data-theme='light'.*brand-mark--logo\.brand-mark--on-brand/);
  assert.match(styles, /content: url\('\/logo-white\.svg'\)/);
});

test('primary header action reuses the application primary token', () => {
  assert.match(styles, /\.nav-primary-action[\s\S]*?background: var\(--theme-primary\) !important/);
});
