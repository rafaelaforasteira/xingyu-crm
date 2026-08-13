CREATE TYPE "OrderStageCategory" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'ISSUE');
CREATE TABLE "OrderStageDefinition" (
  "id" TEXT NOT NULL, "organizationId" TEXT NOT NULL, "code" TEXT NOT NULL,
  "name" TEXT NOT NULL, "translations" JSONB NOT NULL DEFAULT '{}', "color" TEXT NOT NULL DEFAULT '#64748B',
  "position" INTEGER NOT NULL DEFAULT 0, "category" "OrderStageCategory" NOT NULL DEFAULT 'OPEN',
  "isInitial" BOOLEAN NOT NULL DEFAULT false, "isFinal" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true, "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3),
  CONSTRAINT "OrderStageDefinition_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Order" ADD COLUMN "operationalStageId" TEXT;
ALTER TABLE "Order" ADD COLUMN "operationalAssigneeId" TEXT;
ALTER TABLE "Order" ADD COLUMN "operationalPriority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE "Order" ADD COLUMN "operationalDueAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "operationalIssue" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "fulfillmentStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN "currentLocation" TEXT;
CREATE UNIQUE INDEX "OrderStageDefinition_organizationId_code_key" ON "OrderStageDefinition"("organizationId", "code");
CREATE INDEX "OrderStageDefinition_organizationId_active_archived_position_idx" ON "OrderStageDefinition"("organizationId", "active", "archived", "position");
CREATE INDEX "Order_organizationId_operationalStageId_idx" ON "Order"("organizationId", "operationalStageId");
CREATE INDEX "Order_organizationId_operationalAssigneeId_idx" ON "Order"("organizationId", "operationalAssigneeId");
CREATE INDEX "Order_organizationId_operationalDueAt_idx" ON "Order"("organizationId", "operationalDueAt");
ALTER TABLE "OrderStageDefinition" ADD CONSTRAINT "OrderStageDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_operationalStageId_fkey" FOREIGN KEY ("operationalStageId") REFERENCES "OrderStageDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_operationalAssigneeId_fkey" FOREIGN KEY ("operationalAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
