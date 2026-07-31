-- Extend pipeline management without removing or rewriting existing domain records.
CREATE TYPE "PipelineStageType" AS ENUM ('OPEN', 'WON', 'LOST');

ALTER TABLE "Pipeline"
  ADD COLUMN "icon" TEXT,
  ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "defaultTeamId" TEXT,
  ADD COLUMN "defaultOwnerId" TEXT;

ALTER TABLE "PipelineStage"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "type" "PipelineStageType" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "isInitial" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxDurationMinutes" INTEGER,
  ADD COLUMN "probability" INTEGER,
  ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the meaning of the legacy terminal-stage flags.
UPDATE "PipelineStage"
SET "type" = CASE
  WHEN "isWon" THEN 'WON'::"PipelineStageType"
  WHEN "isLost" THEN 'LOST'::"PipelineStageType"
  ELSE 'OPEN'::"PipelineStageType"
END;

-- Preserve the existing stage deadline in the new minute-based field.
UPDATE "PipelineStage"
SET "maxDurationMinutes" = "maxDaysInStage" * 1440
WHERE "maxDaysInStage" IS NOT NULL;

-- Select the first active open stage in every existing pipeline as its entry stage.
WITH initial_stages AS (
  SELECT DISTINCT ON ("pipelineId") "id"
  FROM "PipelineStage"
  WHERE "deletedAt" IS NULL
    AND "type" = 'OPEN'
  ORDER BY "pipelineId", "position", "createdAt", "id"
)
UPDATE "PipelineStage" AS stage
SET "isInitial" = true
FROM initial_stages
WHERE stage."id" = initial_stages."id";

ALTER TABLE "PipelineStage"
  ADD CONSTRAINT "PipelineStage_probability_check"
    CHECK ("probability" IS NULL OR ("probability" >= 0 AND "probability" <= 100)),
  ADD CONSTRAINT "PipelineStage_maxDurationMinutes_check"
    CHECK ("maxDurationMinutes" IS NULL OR "maxDurationMinutes" >= 0),
  ADD CONSTRAINT "PipelineStage_initial_open_check"
    CHECK (NOT "isInitial" OR "type" = 'OPEN');

ALTER TABLE "Pipeline"
  ADD CONSTRAINT "Pipeline_defaultTeamId_fkey"
    FOREIGN KEY ("defaultTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Pipeline_defaultOwnerId_fkey"
    FOREIGN KEY ("defaultOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Pipeline_defaultTeamId_idx" ON "Pipeline"("defaultTeamId");
CREATE INDEX "Pipeline_defaultOwnerId_idx" ON "Pipeline"("defaultOwnerId");
CREATE INDEX "Pipeline_org_deleted_archived_favorite_idx"
  ON "Pipeline"("organizationId", "deletedAt", "archived", "favorite");
CREATE INDEX "PipelineStage_pipeline_deleted_archived_position_idx"
  ON "PipelineStage"("pipelineId", "deletedAt", "archived", "position");
CREATE INDEX "PipelineStage_pipeline_type_idx"
  ON "PipelineStage"("pipelineId", "type");
CREATE UNIQUE INDEX "PipelineStage_one_active_initial_idx"
  ON "PipelineStage"("pipelineId")
  WHERE "isInitial" = true AND "deletedAt" IS NULL;
