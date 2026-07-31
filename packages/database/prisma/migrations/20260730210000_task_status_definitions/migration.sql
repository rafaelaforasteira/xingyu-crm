-- AlterEnum
CREATE TYPE "TaskStatusCategory" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "TaskStatusDefinition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748B',
    "position" INTEGER NOT NULL DEFAULT 0,
    "category" "TaskStatusCategory" NOT NULL DEFAULT 'OPEN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaskStatusDefinition_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "statusDefinitionId" TEXT;
ALTER TABLE "Task" ADD COLUMN "pipelineId" TEXT;
ALTER TABLE "Task" ADD COLUMN "stageId" TEXT;

-- CreateIndex
CREATE INDEX "TaskStatusDefinition_organizationId_active_position_idx" ON "TaskStatusDefinition"("organizationId", "active", "position");
CREATE UNIQUE INDEX "TaskStatusDefinition_organizationId_slug_key" ON "TaskStatusDefinition"("organizationId", "slug");
CREATE INDEX "Task_statusDefinitionId_idx" ON "Task"("statusDefinitionId");
CREATE INDEX "Task_pipelineId_idx" ON "Task"("pipelineId");
CREATE INDEX "Task_stageId_idx" ON "Task"("stageId");

-- AddForeignKey
ALTER TABLE "TaskStatusDefinition" ADD CONSTRAINT "TaskStatusDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_statusDefinitionId_fkey" FOREIGN KEY ("statusDefinitionId") REFERENCES "TaskStatusDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default statuses per organization and backfill tasks
INSERT INTO "TaskStatusDefinition" ("id", "organizationId", "name", "slug", "color", "position", "category", "active", "archived", "createdAt", "updatedAt")
SELECT
  'tsd-' || o."id" || '-pendente',
  o."id",
  'PENDENTE',
  'pendente',
  '#F59E0B',
  0,
  'OPEN',
  true,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" o
WHERE o."deletedAt" IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO "TaskStatusDefinition" ("id", "organizationId", "name", "slug", "color", "position", "category", "active", "archived", "createdAt", "updatedAt")
SELECT
  'tsd-' || o."id" || '-andamento',
  o."id",
  'EM ANDAMENTO',
  'em-andamento',
  '#3B82F6',
  1,
  'IN_PROGRESS',
  true,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" o
WHERE o."deletedAt" IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO "TaskStatusDefinition" ("id", "organizationId", "name", "slug", "color", "position", "category", "active", "archived", "createdAt", "updatedAt")
SELECT
  'tsd-' || o."id" || '-concluido',
  o."id",
  'CONCLUÍDO',
  'concluido',
  '#22C55E',
  2,
  'DONE',
  true,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" o
WHERE o."deletedAt" IS NULL
ON CONFLICT DO NOTHING;

UPDATE "Task" t
SET "statusDefinitionId" = CASE
  WHEN t."status" = 'IN_PROGRESS' THEN 'tsd-' || t."organizationId" || '-andamento'
  WHEN t."status" IN ('COMPLETED', 'CANCELLED') THEN 'tsd-' || t."organizationId" || '-concluido'
  ELSE 'tsd-' || t."organizationId" || '-pendente'
END
WHERE t."statusDefinitionId" IS NULL;

UPDATE "Task" t
SET
  "pipelineId" = d."pipelineId",
  "stageId" = d."stageId"
FROM "Deal" d
WHERE t."dealId" = d."id"
  AND t."pipelineId" IS NULL;
