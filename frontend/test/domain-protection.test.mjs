import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const middleware = await readFile(new URL('src/middleware.ts', root), 'utf8');
const accessRoute = await readFile(new URL('src/app/api/preview-access/route.ts', root), 'utf8');
const accessPage = await readFile(new URL('src/app/preview-access/page.tsx', root), 'utf8');
const accessHelpers = await readFile(new URL('src/lib/preview-access.ts', root), 'utf8');

test('preview protection is restricted to the Pago hostname', () => {
  assert.match(accessHelpers, /PROTECTED_PREVIEW_HOST = 'pago\.outrahora\.com'/);
  assert.match(middleware, /requestHostname\(request\) !== PROTECTED_PREVIEW_HOST/);
  assert.doesNotMatch(middleware, /gandira\.vercel\.app/);
});

test('password is server-side only and Basic Auth was removed', () => {
  assert.match(accessRoute, /process\.env\.PREVIEW_PASSWORD/);
  assert.match(accessRoute, /process\.env\.PREVIEW_COOKIE_SECRET/);
  assert.doesNotMatch(middleware, /WWW-Authenticate|Basic realm|PAGO_BASIC_AUTH/);
  assert.doesNotMatch(`${middleware}${accessRoute}${accessPage}${accessHelpers}`, /eupago/);
  assert.match(accessRoute, /export const runtime = 'nodejs'/);
  assert.match(accessRoute, /passwordField === 'string' \? passwordField\.trim\(\)/);
  assert.match(accessRoute, /process\.env\.PREVIEW_PASSWORD\?\.trim\(\)/);
  assert.match(accessRoute, /passwordMatches/);
});

test('access cookie is signed and uses the required security attributes', () => {
  assert.match(accessHelpers, /HMAC/);
  assert.match(accessHelpers, /SHA-256/);
  assert.match(accessHelpers, /60 \* 60 \* 24 \* 7/);
  assert.match(accessRoute, /httpOnly: true/);
  assert.match(accessRoute, /secure: process\.env\.NODE_ENV === 'production'/);
  assert.match(accessRoute, /sameSite: 'lax'/);
  assert.match(accessRoute, /path: '\/'/);
});

test('access page has the requested copy and generic error', () => {
  assert.match(accessPage, /Área em desenvolvimento/);
  assert.match(accessPage, /Digite a senha para acessar o Pago\./);
  assert.match(accessPage, /Senha incorreta/);
  assert.match(middleware, /PREVIEW_ACCESS_PATH/);
  assert.match(middleware, /isPreviewAccessAsset/);
});

test('protected hostname remains excluded from indexing', () => {
  assert.match(middleware, /NO_INDEX = 'noindex, nofollow, noarchive, nosnippet, noimageindex'/);
  assert.match(middleware, /request\.nextUrl\.pathname === '\/robots\.txt'/);
  assert.match(middleware, /Disallow: \//);
  assert.match(middleware, /Cache-Control', 'no-store'/);
  assert.match(middleware, /matcher: '\/:path\*'/);
});
