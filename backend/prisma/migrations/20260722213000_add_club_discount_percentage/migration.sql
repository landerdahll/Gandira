ALTER TABLE "ClubMember"
  ADD COLUMN "discountPercentage" DECIMAL(5,2) NOT NULL DEFAULT 10.00;

ALTER TABLE "ClubBenefitUsage"
  ADD COLUMN "discountPercentage" DECIMAL(5,2);

UPDATE "ClubBenefitUsage" AS usage
SET "discountPercentage" = member."discountPercentage"
FROM "ClubMember" AS member
WHERE usage."clubMemberId" = member."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "ClubBenefitUsage" WHERE "discountPercentage" IS NULL
  ) THEN
    RAISE EXCEPTION 'Club discount migration aborted: benefit usages without a member percentage must be corrected first';
  END IF;
END $$;

ALTER TABLE "ClubBenefitUsage"
  ALTER COLUMN "discountPercentage" SET NOT NULL;

ALTER TABLE "ClubMember"
  ADD CONSTRAINT "ClubMember_discount_percentage_check"
  CHECK ("discountPercentage" >= 0.01 AND "discountPercentage" <= 99.99);

ALTER TABLE "ClubBenefitUsage"
  ADD CONSTRAINT "ClubBenefitUsage_discount_percentage_check"
  CHECK ("discountPercentage" >= 0.01 AND "discountPercentage" <= 99.99);
