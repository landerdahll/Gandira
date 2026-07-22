-- ClubBenefitUsage previously allowed only one historical row per member/event.
-- A nullable active marker keeps the invariant Prisma-representable: PostgreSQL
-- permits multiple NULL values in a unique index, but only one TRUE value.
BEGIN;

-- A confirmed historical use cannot be safely associated retroactively when
-- more than one ticket exists in the order. Validate before changing schema or
-- data; the migration deliberately stops instead of guessing.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ClubBenefitUsage" WHERE "status" = 'CONFIRMED'
  ) THEN
    RAISE EXCEPTION 'Não é possível adicionar ticketId: existem usos CONFIRMED que exigem associação manual ao ingresso beneficiado';
  END IF;
END $$;

ALTER TABLE "ClubBenefitUsage"
  ADD COLUMN "activeMarker" BOOLEAN;

ALTER TABLE "Order"
  ADD COLUMN "clubBenefitReason" TEXT;

UPDATE "ClubBenefitUsage"
SET "activeMarker" = CASE
  WHEN "status" IN ('RESERVED', 'CONFIRMED') THEN TRUE
  ELSE NULL
END;

DROP INDEX "ClubBenefitUsage_clubMemberId_eventId_key";

CREATE UNIQUE INDEX "ClubBenefitUsage_clubMemberId_eventId_activeMarker_key"
  ON "ClubBenefitUsage"("clubMemberId", "eventId", "activeMarker");

CREATE INDEX "ClubBenefitUsage_clubMemberId_eventId_idx"
  ON "ClubBenefitUsage"("clubMemberId", "eventId");

ALTER TABLE "ClubBenefitUsage"
  ALTER COLUMN "activeMarker" SET DEFAULT TRUE;

ALTER TABLE "ClubBenefitUsage"
  ADD COLUMN "ticketId" TEXT;

CREATE UNIQUE INDEX "ClubBenefitUsage_ticketId_key"
  ON "ClubBenefitUsage"("ticketId");

ALTER TABLE "ClubBenefitUsage"
  ADD CONSTRAINT "ClubBenefitUsage_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClubBenefitUsage"
  ADD CONSTRAINT "ClubBenefitUsage_active_marker_check"
  CHECK (
    ("status" IN ('RESERVED', 'CONFIRMED') AND "activeMarker" IS TRUE)
    OR ("status" = 'RELEASED' AND "activeMarker" IS NULL)
  ),
  ADD CONSTRAINT "ClubBenefitUsage_confirmed_ticket_check"
  CHECK ("status" <> 'CONFIRMED' OR "ticketId" IS NOT NULL);

COMMIT;
