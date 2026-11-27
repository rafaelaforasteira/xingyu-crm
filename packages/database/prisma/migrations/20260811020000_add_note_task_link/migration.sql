ALTER TABLE "Task" ADD COLUMN "sourceNoteId" TEXT;

CREATE INDEX "Task_sourceNoteId_idx" ON "Task"("sourceNoteId");
CREATE INDEX "Note_organizationId_dealId_createdAt_idx" ON "Note"("organizationId", "dealId", "createdAt");

ALTER TABLE "Task" ADD CONSTRAINT "Task_sourceNoteId_fkey"
  FOREIGN KEY ("sourceNoteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;
