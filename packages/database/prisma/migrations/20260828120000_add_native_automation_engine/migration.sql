-- Native automation engine: versions, outbox, jobs, waits, executions, templates.
-- prisma-migrate-disable-transaction

ALTER TYPE "AutomationStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "AutomationStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "Automation"
  ADD COLUMN IF NOT EXISTS "draftDefinition" JSONB,
  ADD COLUMN IF NOT EXISTS "settings" JSONB,
  ADD COLUMN IF NOT EXISTS "webhookToken" TEXT,
  ADD COLUMN IF NOT EXISTS "activeVersionId" TEXT,
  ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "scopeType" TEXT NOT NULL DEFAULT 'ORGANIZATION',
  ADD COLUMN IF NOT EXISTS "scopeId" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

ALTER TABLE "Automation" ALTER COLUMN "triggerType" SET DEFAULT 'GRAPH';

CREATE UNIQUE INDEX IF NOT EXISTS "Automation_webhookToken_key" ON "Automation"("webhookToken");
CREATE UNIQUE INDEX IF NOT EXISTS "Automation_activeVersionId_key" ON "Automation"("activeVersionId");
CREATE INDEX IF NOT EXISTS "Automation_organizationId_status_deletedAt_idx" ON "Automation"("organizationId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "Automation_organizationId_scopeType_scopeId_idx" ON "Automation"("organizationId", "scopeType", "scopeId");

ALTER TABLE "AutomationExecution"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
  ADD COLUMN IF NOT EXISTS "versionId" TEXT,
  ADD COLUMN IF NOT EXISTS "triggerEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "subjectType" TEXT,
  ADD COLUMN IF NOT EXISTS "subjectId" TEXT,
  ADD COLUMN IF NOT EXISTS "currentNodeId" TEXT,
  ADD COLUMN IF NOT EXISTS "waitingUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "input" JSONB,
  ADD COLUMN IF NOT EXISTS "output" JSONB,
  ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "AutomationExecution_organizationId_status_startedAt_idx" ON "AutomationExecution"("organizationId", "status", "startedAt");
CREATE INDEX IF NOT EXISTS "AutomationExecution_versionId_idx" ON "AutomationExecution"("versionId");
CREATE INDEX IF NOT EXISTS "AutomationExecution_triggerEventId_idx" ON "AutomationExecution"("triggerEventId");
CREATE INDEX IF NOT EXISTS "AutomationExecution_subjectType_subjectId_idx" ON "AutomationExecution"("subjectType", "subjectId");

CREATE TABLE IF NOT EXISTS "AutomationVersion" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationVersion_automationId_version_key" ON "AutomationVersion"("automationId", "version");
CREATE INDEX IF NOT EXISTS "AutomationVersion_organizationId_publishedAt_idx" ON "AutomationVersion"("organizationId", "publishedAt");

CREATE TABLE IF NOT EXISTS "AutomationNodeExecution" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "input" JSONB,
    "output" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationNodeExecution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationNodeExecution_executionId_nodeId_attempt_key" ON "AutomationNodeExecution"("executionId", "nodeId", "attempt");
CREATE INDEX IF NOT EXISTS "AutomationNodeExecution_organizationId_status_startedAt_idx" ON "AutomationNodeExecution"("organizationId", "status", "startedAt");
CREATE INDEX IF NOT EXISTS "AutomationNodeExecution_executionId_startedAt_idx" ON "AutomationNodeExecution"("executionId", "startedAt");

CREATE TABLE IF NOT EXISTS "AutomationDomainEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'SYSTEM',
    "actorId" TEXT,
    "correlationId" TEXT,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "deduplicationKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationDomainEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationDomainEvent_organizationId_deduplicationKey_key" ON "AutomationDomainEvent"("organizationId", "deduplicationKey");
CREATE INDEX IF NOT EXISTS "AutomationDomainEvent_status_availableAt_createdAt_idx" ON "AutomationDomainEvent"("status", "availableAt", "createdAt");
CREATE INDEX IF NOT EXISTS "AutomationDomainEvent_organizationId_eventType_occurredAt_idx" ON "AutomationDomainEvent"("organizationId", "eventType", "occurredAt");
CREATE INDEX IF NOT EXISTS "AutomationDomainEvent_aggregateType_aggregateId_occurredAt_idx" ON "AutomationDomainEvent"("aggregateType", "aggregateId", "occurredAt");

CREATE TABLE IF NOT EXISTS "AutomationJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationId" TEXT,
    "executionId" TEXT,
    "nodeId" TEXT,
    "jobType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 8,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "uniqueKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationJob_organizationId_uniqueKey_key" ON "AutomationJob"("organizationId", "uniqueKey");
CREATE INDEX IF NOT EXISTS "AutomationJob_status_runAt_createdAt_idx" ON "AutomationJob"("status", "runAt", "createdAt");
CREATE INDEX IF NOT EXISTS "AutomationJob_executionId_status_idx" ON "AutomationJob"("executionId", "status");
CREATE INDEX IF NOT EXISTS "AutomationJob_automationId_status_idx" ON "AutomationJob"("automationId", "status");

CREATE TABLE IF NOT EXISTS "AutomationWaitSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "correlation" JSONB,
    "resumeNodeIds" JSONB NOT NULL,
    "timeoutHandle" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "expiresAt" TIMESTAMP(3),
    "resumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationWaitSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AutomationWaitSubscription_organizationId_eventType_status_idx" ON "AutomationWaitSubscription"("organizationId", "eventType", "status");
CREATE INDEX IF NOT EXISTS "AutomationWaitSubscription_subjectType_subjectId_status_idx" ON "AutomationWaitSubscription"("subjectType", "subjectId", "status");
CREATE INDEX IF NOT EXISTS "AutomationWaitSubscription_status_expiresAt_idx" ON "AutomationWaitSubscription"("status", "expiresAt");

CREATE TABLE IF NOT EXISTS "AutomationTriggerSubscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "filters" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationTriggerSubscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationTriggerSubscription_automationId_versionId_eventType_key" ON "AutomationTriggerSubscription"("automationId", "versionId", "eventType");
CREATE INDEX IF NOT EXISTS "AutomationTriggerSubscription_organizationId_eventType_active_idx" ON "AutomationTriggerSubscription"("organizationId", "eventType", "active");

CREATE TABLE IF NOT EXISTS "AutomationTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationTemplate_organizationId_key_key" ON "AutomationTemplate"("organizationId", "key");
CREATE INDEX IF NOT EXISTS "AutomationTemplate_category_active_idx" ON "AutomationTemplate"("category", "active");

CREATE TABLE IF NOT EXISTS "AutomationIdempotency" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "executionId" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AutomationIdempotency_organizationId_key_key" ON "AutomationIdempotency"("organizationId", "key");
CREATE INDEX IF NOT EXISTS "AutomationIdempotency_createdAt_idx" ON "AutomationIdempotency"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Automation_activeVersionId_fkey'
  ) THEN
    ALTER TABLE "Automation" ADD CONSTRAINT "Automation_activeVersionId_fkey"
      FOREIGN KEY ("activeVersionId") REFERENCES "AutomationVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationVersion_organizationId_fkey'
  ) THEN
    ALTER TABLE "AutomationVersion" ADD CONSTRAINT "AutomationVersion_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationVersion_automationId_fkey'
  ) THEN
    ALTER TABLE "AutomationVersion" ADD CONSTRAINT "AutomationVersion_automationId_fkey"
      FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationExecution_organizationId_fkey'
  ) THEN
    ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationExecution_versionId_fkey'
  ) THEN
    ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_versionId_fkey"
      FOREIGN KEY ("versionId") REFERENCES "AutomationVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationNodeExecution_organizationId_fkey'
  ) THEN
    ALTER TABLE "AutomationNodeExecution" ADD CONSTRAINT "AutomationNodeExecution_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationNodeExecution_executionId_fkey'
  ) THEN
    ALTER TABLE "AutomationNodeExecution" ADD CONSTRAINT "AutomationNodeExecution_executionId_fkey"
      FOREIGN KEY ("executionId") REFERENCES "AutomationExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationDomainEvent_organizationId_fkey'
  ) THEN
    ALTER TABLE "AutomationDomainEvent" ADD CONSTRAINT "AutomationDomainEvent_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationJob_organizationId_fkey'
  ) THEN
    ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationJob_automationId_fkey'
  ) THEN
    ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_automationId_fkey"
      FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationJob_executionId_fkey'
  ) THEN
    ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_executionId_fkey"
      FOREIGN KEY ("executionId") REFERENCES "AutomationExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationWaitSubscription_organizationId_fkey'
  ) THEN
    ALTER TABLE "AutomationWaitSubscription" ADD CONSTRAINT "AutomationWaitSubscription_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationWaitSubscription_executionId_fkey'
  ) THEN
    ALTER TABLE "AutomationWaitSubscription" ADD CONSTRAINT "AutomationWaitSubscription_executionId_fkey"
      FOREIGN KEY ("executionId") REFERENCES "AutomationExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationTriggerSubscription_organizationId_fkey'
  ) THEN
    ALTER TABLE "AutomationTriggerSubscription" ADD CONSTRAINT "AutomationTriggerSubscription_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationTriggerSubscription_automationId_fkey'
  ) THEN
    ALTER TABLE "AutomationTriggerSubscription" ADD CONSTRAINT "AutomationTriggerSubscription_automationId_fkey"
      FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationTriggerSubscription_versionId_fkey'
  ) THEN
    ALTER TABLE "AutomationTriggerSubscription" ADD CONSTRAINT "AutomationTriggerSubscription_versionId_fkey"
      FOREIGN KEY ("versionId") REFERENCES "AutomationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationTemplate_organizationId_fkey'
  ) THEN
    ALTER TABLE "AutomationTemplate" ADD CONSTRAINT "AutomationTemplate_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AutomationIdempotency_organizationId_fkey'
  ) THEN
    ALTER TABLE "AutomationIdempotency" ADD CONSTRAINT "AutomationIdempotency_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
