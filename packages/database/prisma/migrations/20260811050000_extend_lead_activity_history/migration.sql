ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'TASK_REOPENED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'FILE_SAVED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'FILE_REMOVED';

CREATE INDEX "Activity_deal_timeline_idx"
  ON "Activity"("organizationId", "dealId", "createdAt" DESC);
