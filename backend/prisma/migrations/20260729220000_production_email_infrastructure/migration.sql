-- Tokens antigos são deliberadamente invalidados: contas confirmadas e senhas não são alteradas.
DELETE FROM "EmailVerificationToken";
DELETE FROM "PasswordResetToken";

ALTER TYPE "TicketTransferStatus" ADD VALUE 'PENDING_EMAIL_VERIFICATION';

CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'RETRY', 'FAILED');

ALTER TABLE "User"
  ADD COLUMN "verificationEmailLastSentAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetLastSentAt" TIMESTAMP(3);

ALTER TABLE "EmailVerificationToken"
  DROP COLUMN "token",
  ADD COLUMN "tokenHash" TEXT NOT NULL;

ALTER TABLE "PasswordResetToken"
  DROP COLUMN "token",
  ADD COLUMN "tokenHash" TEXT NOT NULL;

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_tokenHash_idx" ON "EmailVerificationToken"("tokenHash");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

CREATE TABLE "EmailOutbox" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "template" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "relatedEntityType" TEXT,
  "relatedEntityId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "status" "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "processingAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailOutbox_idempotencyKey_key" ON "EmailOutbox"("idempotencyKey");
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");
CREATE INDEX "EmailOutbox_processingAt_idx" ON "EmailOutbox"("processingAt");
CREATE INDEX "EmailOutbox_relatedEntityType_relatedEntityId_idx" ON "EmailOutbox"("relatedEntityType", "relatedEntityId");
CREATE INDEX "EmailOutbox_createdAt_idx" ON "EmailOutbox"("createdAt");
