-- CreateEnum
CREATE TYPE "ProjectBlockStatus" AS ENUM ('DRAFT', 'EDITING', 'GENERATING', 'GENERATED', 'FAILED');

-- AlterTable
ALTER TABLE "ProjectBlock" ADD COLUMN     "lockExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lockOwnerId" TEXT,
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "status" "ProjectBlockStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "timelineDurationMs" INTEGER,
ADD COLUMN     "timelineStartMs" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ProjectBlock_lockOwnerId_idx" ON "ProjectBlock"("lockOwnerId");

-- CreateIndex
CREATE INDEX "ProjectBlock_lockExpiresAt_idx" ON "ProjectBlock"("lockExpiresAt");
