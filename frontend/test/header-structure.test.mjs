import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const navbar = readFileSync(new URL('../src/components/layout/navbar.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');

test('header background is full width with no external page margin', () => {
  assert.match(globals, /body\s*{[^}]*margin:\s*0;[^}]*padding:\s*0;/s);
  assert.match(globals, /\.theme-navbar\s*{[^}]*width:\s*100%;[^}]*margin:\s*0;/s);
  assert.match(navbar, /<header className="theme-navbar"/);
});

test('navbar keeps a centered inner container and uses responsive vertical padding', () => {
  assert.match(navbar, /className="navbar-inner"[^>]*style={{[\s\S]*?maxWidth:\s*'1280px',[\s\S]*?margin:\s*'0 auto'/);
  assert.doesNotMatch(navbar, /height:\s*'70px'/);
  assert.match(globals, /\.navbar-inner\s*{\s*padding:\s*24px 16px;\s*}/);
  assert.match(globals, /@media \(max-width:\s*640px\)[\s\S]*?\.navbar-inner\s*{\s*padding:\s*20px 16px;\s*}/);
});

test('theme backgrounds and navbar content sizing remain unchanged', () => {
  assert.match(navbar, /background:\s*'rgba\(10,10,10,0\.96\)'/);
  assert.match(navbar, /height:\s*'31px'/);
  assert.match(globals, /\.theme-toggle\s*{[^}]*width:\s*36px;[^}]*height:\s*36px;/s);
  assert.match(globals, /:root\[data-theme='light'\] \.theme-navbar\s*{/);
  assert.match(globals, /:root\[data-theme='light'\] \.theme-navbar[\s\S]*?linear-gradient\(115deg,/);
});
