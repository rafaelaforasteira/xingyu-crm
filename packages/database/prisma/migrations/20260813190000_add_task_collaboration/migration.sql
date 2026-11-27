ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TASK_MENTION';

CREATE TABLE "TaskComment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TaskCommentMention" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskCommentMention_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TaskCommentAttachment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "url" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'file',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskCommentAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TaskComment_organizationId_taskId_createdAt_idx" ON "TaskComment"("organizationId", "taskId", "createdAt");
CREATE UNIQUE INDEX "TaskCommentMention_commentId_userId_key" ON "TaskCommentMention"("commentId", "userId");
CREATE INDEX "TaskCommentMention_organizationId_userId_createdAt_idx" ON "TaskCommentMention"("organizationId", "userId", "createdAt");
CREATE INDEX "TaskCommentAttachment_organizationId_commentId_idx" ON "TaskCommentAttachment"("organizationId", "commentId");
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskCommentMention" ADD CONSTRAINT "TaskCommentMention_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskCommentMention" ADD CONSTRAINT "TaskCommentMention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskCommentMention" ADD CONSTRAINT "TaskCommentMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskCommentAttachment" ADD CONSTRAINT "TaskCommentAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskCommentAttachment" ADD CONSTRAINT "TaskCommentAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TaskComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
