export const PROTECTED_PREVIEW_HOST = 'pago.outrahora.com';
export const PREVIEW_ACCESS_PATH = '/preview-access';
export const PREVIEW_ACCESS_COOKIE = 'pago_preview_access';
export const PREVIEW_ACCESS_MAX_AGE = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function createPreviewCookieValue(secret: string, now = Date.now()) {
  const expiresAt = String(now + PREVIEW_ACCESS_MAX_AGE * 1000);
  return `${expiresAt}.${await sign(expiresAt, secret)}`;
}

export async function isValidPreviewCookie(value: string, secret: string, now = Date.now()) {
  const separator = value.indexOf('.');
  if (separator === -1) return false;

  const expiresAt = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  const expiration = Number(expiresAt);
  if (!Number.isSafeInteger(expiration) || expiration <= now) return false;

  const expectedSignature = await sign(expiresAt, secret);
  return constantTimeEqual(signature, expectedSignature);
}
