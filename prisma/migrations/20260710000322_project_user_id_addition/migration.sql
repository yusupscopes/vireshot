-- Add the userId column as nullable so existing rows are not rejected.
ALTER TABLE "Project" ADD COLUMN "userId" TEXT;

-- Backfill any pre-existing projects with a sentinel owner.
-- These projects were created before per-user scoping and should be reassigned by an admin.
UPDATE "Project" SET "userId" = 'legacy' WHERE "userId" IS NULL;

-- Enforce non-null values for all future inserts.
ALTER TABLE "Project" ALTER COLUMN "userId" SET NOT NULL;
