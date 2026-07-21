CREATE TYPE "TicketTransferStatus" AS ENUM ('PENDING_REGISTRATION', 'COMPLETED', 'CANCELLED', 'EXPIRED');
ALTER TYPE "TicketStatus" ADD VALUE 'TRANSFER_PENDING';

ALTER TABLE "Event" ADD COLUMN "allowTicketTransfers" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Ticket" ADD COLUMN "ownerUserId" TEXT;
UPDATE "Ticket" t SET "ownerUserId" = o."userId" FROM "Order" o WHERE o.id = t."orderId";
ALTER TABLE "Ticket" ALTER COLUMN "ownerUserId" SET NOT NULL;

CREATE TABLE "TicketTransfer" (
  "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "eventId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL, "recipientUserId" TEXT, "recipientEmail" TEXT NOT NULL,
  "status" "TicketTransferStatus" NOT NULL, "invitationTokenHash" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "previousQrIdentifier" TEXT,
  "newQrIdentifier" TEXT, "cancellationReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketTransfer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TicketHistory" (
  "id" TEXT NOT NULL, "ticketId" TEXT NOT NULL, "transferId" TEXT, "action" TEXT NOT NULL,
  "actorUserId" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketTransfer_invitationTokenHash_key" ON "TicketTransfer"("invitationTokenHash");
CREATE UNIQUE INDEX "TicketTransfer_one_pending_per_ticket" ON "TicketTransfer"("ticketId") WHERE "status" = 'PENDING_REGISTRATION';
CREATE INDEX "TicketTransfer_ticketId_status_idx" ON "TicketTransfer"("ticketId", "status");
CREATE INDEX "TicketTransfer_senderUserId_requestedAt_idx" ON "TicketTransfer"("senderUserId", "requestedAt");
CREATE INDEX "TicketTransfer_recipientUserId_requestedAt_idx" ON "TicketTransfer"("recipientUserId", "requestedAt");
CREATE INDEX "TicketTransfer_recipientEmail_idx" ON "TicketTransfer"("recipientEmail");
CREATE INDEX "TicketTransfer_eventId_requestedAt_idx" ON "TicketTransfer"("eventId", "requestedAt");
CREATE INDEX "TicketHistory_ticketId_createdAt_idx" ON "TicketHistory"("ticketId", "createdAt");
CREATE INDEX "TicketHistory_transferId_createdAt_idx" ON "TicketHistory"("transferId", "createdAt");
CREATE INDEX "Ticket_ownerUserId_status_idx" ON "Ticket"("ownerUserId", "status");

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "TicketTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
