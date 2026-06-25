-- CreateEnum
CREATE TYPE "ProjectExportStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "ProjectExport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "ProjectExportStatus" NOT NULL DEFAULT 'PROCESSING',
    "r2ObjectKey" TEXT,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'audio/wav',
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectExport_projectId_idx" ON "ProjectExport"("projectId");

-- CreateIndex
CREATE INDEX "ProjectExport_status_idx" ON "ProjectExport"("status");

-- CreateIndex
CREATE INDEX "ProjectExport_createdAt_idx" ON "ProjectExport"("createdAt");

-- AddForeignKey
ALTER TABLE "ProjectExport" ADD CONSTRAINT "ProjectExport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
