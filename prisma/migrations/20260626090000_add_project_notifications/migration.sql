-- CreateEnum
CREATE TYPE "ProjectNotificationType" AS ENUM ('COMMENT_MENTION');

-- CreateTable
CREATE TABLE "ProjectNotification" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "recipientUsername" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "type" "ProjectNotificationType" NOT NULL DEFAULT 'COMMENT_MENTION',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectNotification_orgId_idx" ON "ProjectNotification"("orgId");

-- CreateIndex
CREATE INDEX "ProjectNotification_projectId_idx" ON "ProjectNotification"("projectId");

-- CreateIndex
CREATE INDEX "ProjectNotification_recipientUserId_isRead_createdAt_idx" ON "ProjectNotification"("recipientUserId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectNotification_commentId_idx" ON "ProjectNotification"("commentId");

-- AddForeignKey
ALTER TABLE "ProjectNotification" ADD CONSTRAINT "ProjectNotification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
