ALTER TABLE "Event"
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Event_featured_endDate_idx" ON "Event"("featured", "endDate");
