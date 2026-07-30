-- Fundação multi-organização (expand-only).
-- User.role e Event.producerId permanecem para compatibilidade e rollback.

CREATE TYPE "PlatformRole" AS ENUM ('MEMBER', 'SUPER_ADMIN');
CREATE TYPE "OrganizationRole" AS ENUM ('ORG_ADMIN', 'PRODUCER', 'STAFF');
CREATE TYPE "OrganizationMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

ALTER TABLE "User"
ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'MEMBER';

CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key"
ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "OrganizationMember_userId_status_idx"
ON "OrganizationMember"("userId", "status");
CREATE INDEX "OrganizationMember_organizationId_role_status_idx"
ON "OrganizationMember"("organizationId", "role", "status");

ALTER TABLE "OrganizationMember"
ADD CONSTRAINT "OrganizationMember_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember"
ADD CONSTRAINT "OrganizationMember_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Organization" ("id", "name", "slug", "updatedAt")
VALUES ('org_outrahora', 'OutraHora', 'outrahora', CURRENT_TIMESTAMP);

UPDATE "User"
SET "platformRole" = 'SUPER_ADMIN'
WHERE "role" = 'ADMIN';

INSERT INTO "OrganizationMember" ("id", "organizationId", "userId", "role", "updatedAt")
SELECT 'org_member_' || md5("id" || ':outrahora'), 'org_outrahora', "id",
       CASE "role"::text
         WHEN 'ADMIN' THEN 'ORG_ADMIN'::"OrganizationRole"
         WHEN 'PRODUCER' THEN 'PRODUCER'::"OrganizationRole"
         WHEN 'STAFF' THEN 'STAFF'::"OrganizationRole"
       END,
       CURRENT_TIMESTAMP
FROM "User"
WHERE "role" IN ('ADMIN', 'PRODUCER', 'STAFF');

ALTER TABLE "Event" ADD COLUMN "organizationId" TEXT;
UPDATE "Event" SET "organizationId" = 'org_outrahora';
ALTER TABLE "Event" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX "Event_organizationId_idx" ON "Event"("organizationId");
CREATE INDEX "Event_organizationId_status_startDate_idx"
ON "Event"("organizationId", "status", "startDate");

ALTER TABLE "Event"
ADD CONSTRAINT "Event_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
