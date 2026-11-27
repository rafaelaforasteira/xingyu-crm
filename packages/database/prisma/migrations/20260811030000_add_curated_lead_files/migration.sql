CREATE TABLE "LeadFile" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "conversationId" TEXT,
  "messageId" TEXT,
  "attachmentId" TEXT,
  "savedById" TEXT,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT,
  "fileSize" INTEGER,
  "url" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "messageDirection" "MessageDirection",
  "messageCreatedAt" TIMESTAMP(3),
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadFile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadFile_dealId_attachmentId_key" ON "LeadFile"("dealId", "attachmentId");
CREATE INDEX "LeadFile_organizationId_dealId_savedAt_idx" ON "LeadFile"("organizationId", "dealId", "savedAt");
CREATE INDEX "LeadFile_messageId_idx" ON "LeadFile"("messageId");
CREATE INDEX "LeadFile_attachmentId_idx" ON "LeadFile"("attachmentId");

ALTER TABLE "LeadFile" ADD CONSTRAINT "LeadFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadFile" ADD CONSTRAINT "LeadFile_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadFile" ADD CONSTRAINT "LeadFile_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadFile" ADD CONSTRAINT "LeadFile_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadFile" ADD CONSTRAINT "LeadFile_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "MessageAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeadFile" ADD CONSTRAINT "LeadFile_savedById_fkey" FOREIGN KEY ("savedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
