-- Validate existing data before making email the ClubMember identifier.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ClubMember" WHERE "email" IS NULL) THEN
    RAISE EXCEPTION 'ClubMember migration aborted: members without email must be corrected first';
  END IF;

  IF EXISTS (SELECT 1 FROM "ClubMember" WHERE BTRIM("email") = '') THEN
    RAISE EXCEPTION 'ClubMember migration aborted: members with empty email must be corrected first';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ClubMember"
    GROUP BY LOWER(BTRIM("email"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'ClubMember migration aborted: duplicate emails after trim/lowercase normalization must be corrected first';
  END IF;
END $$;

-- Persist the canonical identifier before adding its constraints.
UPDATE "ClubMember"
SET "email" = LOWER(BTRIM("email"));

-- Replace the CPF identifier with the normalized email identifier.
DROP INDEX "ClubMember_cpf_key";
DROP INDEX "ClubMember_email_idx";

ALTER TABLE "ClubMember"
  DROP COLUMN "cpf",
  ALTER COLUMN "email" SET NOT NULL;

CREATE UNIQUE INDEX "ClubMember_email_key" ON "ClubMember"("email");

ALTER TABLE "ClubMember"
  ADD CONSTRAINT "ClubMember_email_normalized_check"
  CHECK ("email" = LOWER(BTRIM("email")) AND LENGTH("email") > 0);
