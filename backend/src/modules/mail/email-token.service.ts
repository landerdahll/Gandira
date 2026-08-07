import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type EmailTokenPurpose = 'email-verification' | 'password-reset' | 'transfer-invite' | 'organization-invite';

/**
 * Tokens duráveis sem persistência do segredo:
 * 1. O token público é `<recordId>.<HMAC-SHA-256(recordId:purpose)>`.
 * 2. O banco guarda exclusivamente SHA-256(token público).
 * 3. A outbox guarda recordId + purpose, ambos não secretos, e reconstrói o token
 *    com EMAIL_TOKEN_SECRET somente no backend durante cada tentativa.
 * 4. A validação recalcula SHA-256 e usa comparação em tempo constante.
 * 5. Expiração e uso único continuam nos campos expiresAt e usedAt.
 *
 * Alterar EMAIL_TOKEN_SECRET invalida todos os links ainda pendentes. Contas já
 * confirmadas e senhas atuais não são afetadas; o usuário deve solicitar novo link.
 * A chave nunca deve ser enviada ao frontend, persistida ou registrada em logs.
 */
@Injectable()
export class EmailTokenService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    const get = (config as any)?.get?.bind(config);
    const configured = get?.('EMAIL_TOKEN_SECRET')?.trim();
    if (!configured && (get?.('NODE_ENV') ?? process.env.NODE_ENV) !== 'test') {
      throw new Error('EMAIL_TOKEN_SECRET é obrigatória no backend.');
    }
    if (configured && configured.length < 32) throw new Error('EMAIL_TOKEN_SECRET deve ter pelo menos 32 caracteres.');
    this.secret = configured || 'test-only-email-token-secret-not-for-production';
  }

  reconstruct(recordId: string, purpose: EmailTokenPurpose) {
    const signature = createHmac('sha256', this.secret).update(`${purpose}:${recordId}`).digest('hex');
    return `${recordId}.${signature}`;
  }

  hash(token: string) { return createHash('sha256').update(token).digest('hex'); }

  hashForRecord(recordId: string, purpose: EmailTokenPurpose) {
    return this.hash(this.reconstruct(recordId, purpose));
  }

  matches(token: string, expectedHash: string) {
    const actual = Buffer.from(this.hash(token), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
