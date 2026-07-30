-- Fase 2 (limpeza) — NÃO executar junto com prisma migrate deploy.
-- Mover para prisma/migrations somente após validar o backend novo em produção,
-- confirmar que não há rollback pendente e realizar um novo backup completo.

-- Apenas registros legados (sem hash) são invalidados. Registros novos permanecem.
DELETE FROM "EmailVerificationToken" WHERE "tokenHash" IS NULL;
DELETE FROM "PasswordResetToken" WHERE "tokenHash" IS NULL;

DROP INDEX IF EXISTS "EmailVerificationToken_token_key";
DROP INDEX IF EXISTS "EmailVerificationToken_token_idx";
DROP INDEX IF EXISTS "PasswordResetToken_token_key";
DROP INDEX IF EXISTS "PasswordResetToken_token_idx";

ALTER TABLE "EmailVerificationToken"
  DROP COLUMN "token",
  ALTER COLUMN "tokenHash" SET NOT NULL;

ALTER TABLE "PasswordResetToken"
  DROP COLUMN "token",
  ALTER COLUMN "tokenHash" SET NOT NULL;
