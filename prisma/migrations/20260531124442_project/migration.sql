-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'PROMPT';

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- Insert a default project to satisfy existing messages
INSERT INTO "Project" ("id", "name", "updatedAt")
VALUES ('00000000-0000-0000-0000-000000000000', 'Legacy Project', CURRENT_TIMESTAMP);

-- Add column with a default value so existing rows are backfilled safely
ALTER TABLE "Message" ADD COLUMN "projectId" TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Remove the default so future inserts must provide a real projectId
ALTER TABLE "Message" ALTER COLUMN "projectId" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
