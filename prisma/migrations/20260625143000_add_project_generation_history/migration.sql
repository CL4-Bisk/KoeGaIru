-- AlterTable
ALTER TABLE "ProjectExport" ADD COLUMN "sourceHash" TEXT;

-- CreateTable
CREATE TABLE "ProjectBlockGeneration" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectBlockGeneration_pkey" PRIMARY KEY ("id")
);

-- Backfill existing current block audio into history.
INSERT INTO "ProjectBlockGeneration" ("id", "blockId", "generationId", "createdAt")
SELECT
    "ProjectBlock"."id" || ':' || "ProjectBlock"."generationId",
    "ProjectBlock"."id",
    "ProjectBlock"."generationId",
    "ProjectBlock"."updatedAt"
FROM "ProjectBlock"
WHERE "ProjectBlock"."generationId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectBlockGeneration_blockId_generationId_key" ON "ProjectBlockGeneration"("blockId", "generationId");

-- CreateIndex
CREATE INDEX "ProjectBlockGeneration_blockId_createdAt_idx" ON "ProjectBlockGeneration"("blockId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectBlockGeneration_generationId_idx" ON "ProjectBlockGeneration"("generationId");

-- CreateIndex
CREATE INDEX "ProjectExport_sourceHash_idx" ON "ProjectExport"("sourceHash");

-- AddForeignKey
ALTER TABLE "ProjectBlockGeneration" ADD CONSTRAINT "ProjectBlockGeneration_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "ProjectBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBlockGeneration" ADD CONSTRAINT "ProjectBlockGeneration_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
