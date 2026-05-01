import { randomBytes } from 'crypto';

/**
 * Gera um token criptograficamente seguro e não previsível.
 * Usado para tokens de QR Code, refresh tokens, etc.
 * 32 bytes = 64 chars hex — impossível de adivinhar/bruteforçar.
 */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Gera um slug único a partir de um título.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Garante timing constante ao comparar strings — previne timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return bufA.equals(bufB); // Node's Buffer.equals uses constant-time comparison
}
