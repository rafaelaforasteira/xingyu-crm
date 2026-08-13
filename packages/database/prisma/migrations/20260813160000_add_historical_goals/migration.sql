CREATE TYPE "GoalScope" AS ENUM ('ORGANIZATION', 'TEAM', 'USER');
CREATE TYPE "GoalMetric" AS ENUM ('REVENUE', 'ORDERS', 'NEW_CUSTOMERS', 'REPEAT_CUSTOMERS');

CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metric" "GoalMetric" NOT NULL,
    "scope" "GoalScope" NOT NULL,
    "teamId" TEXT,
    "userId" TEXT,
    "pipelineId" TEXT,
    "targetValue" DECIMAL(14,2) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Goal_scope_target_check" CHECK (
      ("scope" = 'ORGANIZATION' AND "teamId" IS NULL AND "userId" IS NULL) OR
      ("scope" = 'TEAM' AND "teamId" IS NOT NULL AND "userId" IS NULL) OR
      ("scope" = 'USER' AND "teamId" IS NULL AND "userId" IS NOT NULL)
    ),
    CONSTRAINT "Goal_period_check" CHECK ("periodStart" < "periodEnd"),
    CONSTRAINT "Goal_target_check" CHECK ("targetValue" > 0)
);

CREATE INDEX "Goal_organizationId_periodStart_periodEnd_idx" ON "Goal"("organizationId", "periodStart", "periodEnd");
CREATE INDEX "Goal_organizationId_scope_metric_idx" ON "Goal"("organizationId", "scope", "metric");
CREATE INDEX "Goal_teamId_idx" ON "Goal"("teamId");
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");
CREATE INDEX "Goal_pipelineId_idx" ON "Goal"("pipelineId");

ALTER TABLE "Goal" ADD CONSTRAINT "Goal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
