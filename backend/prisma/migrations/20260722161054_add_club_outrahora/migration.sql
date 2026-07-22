-- CreateEnum
CREATE TYPE "ClubBenefitUsageStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'RELEASED');

-- CreateTable
CREATE TABLE "ClubMember" (
    "id" TEXT NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubBenefitUsage" (
    "id" TEXT NOT NULL,
    "clubMemberId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "ClubBenefitUsageStatus" NOT NULL DEFAULT 'RESERVED',
    "reservedOrderId" TEXT,
    "confirmedOrderId" TEXT,
    "batchId" TEXT,
    "originalAmount" DECIMAL(10,2),
    "discountAmount" DECIMAL(10,2),
    "finalAmount" DECIMAL(10,2),
    "reservedAt" TIMESTAMP(3),
    "reservationExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubBenefitUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubMember_cpf_key" ON "ClubMember"("cpf");

-- CreateIndex
CREATE INDEX "ClubMember_name_idx" ON "ClubMember"("name");

-- CreateIndex
CREATE INDEX "ClubMember_email_idx" ON "ClubMember"("email");

-- CreateIndex
CREATE INDEX "ClubMember_phone_idx" ON "ClubMember"("phone");

-- CreateIndex
CREATE INDEX "ClubMember_isActive_idx" ON "ClubMember"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClubBenefitUsage_reservedOrderId_key" ON "ClubBenefitUsage"("reservedOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubBenefitUsage_confirmedOrderId_key" ON "ClubBenefitUsage"("confirmedOrderId");

-- CreateIndex
CREATE INDEX "ClubBenefitUsage_status_reservationExpiresAt_idx" ON "ClubBenefitUsage"("status", "reservationExpiresAt");

-- CreateIndex
CREATE INDEX "ClubBenefitUsage_eventId_status_idx" ON "ClubBenefitUsage"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClubBenefitUsage_clubMemberId_eventId_key" ON "ClubBenefitUsage"("clubMemberId", "eventId");

-- AddForeignKey
ALTER TABLE "ClubBenefitUsage" ADD CONSTRAINT "ClubBenefitUsage_clubMemberId_fkey" FOREIGN KEY ("clubMemberId") REFERENCES "ClubMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubBenefitUsage" ADD CONSTRAINT "ClubBenefitUsage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubBenefitUsage" ADD CONSTRAINT "ClubBenefitUsage_reservedOrderId_fkey" FOREIGN KEY ("reservedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubBenefitUsage" ADD CONSTRAINT "ClubBenefitUsage_confirmedOrderId_fkey" FOREIGN KEY ("confirmedOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubBenefitUsage" ADD CONSTRAINT "ClubBenefitUsage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
