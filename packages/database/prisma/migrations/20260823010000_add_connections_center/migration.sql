-- Connection Center: evolve Channel lifecycle + routing default + access + webhook idempotency

CREATE TYPE "ConnectionLifecycleStatus" AS ENUM (
  'DRAFT',
  'CONNECTING',
  'QR_PENDING',
  'CONNECTED',
  'RECONNECTING',
  'DISCONNECTED',
  'ERROR',
  'ARCHIVED'
);

ALTER TABLE "Channel"
  ADD COLUMN IF NOT EXISTS "displayAccount" TEXT,
  ADD COLUMN IF NOT EXISTS "lifecycleStatus" "ConnectionLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "configurationComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "connectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "disconnectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastInboundAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastOutboundAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastErrorCode" TEXT,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- Map legacy ACTIVE channels to CONNECTED for existing data
UPDATE "Channel"
SET "lifecycleStatus" = 'CONNECTED'
WHERE "status" = 'ACTIVE'
  AND "deletedAt" IS NULL
  AND "lifecycleStatus" = 'DRAFT';

CREATE INDEX IF NOT EXISTS "Channel_organizationId_lifecycleStatus_archivedAt_deletedAt_idx"
  ON "Channel"("organizationId", "lifecycleStatus", "archivedAt", "deletedAt");

ALTER TABLE "PipelineChannelConnection"
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "condition" JSONB;

CREATE INDEX IF NOT EXISTS "PipelineChannelConnection_channelId_deletedAt_active_idx"
  ON "PipelineChannelConnection"("channelId", "deletedAt", "active");

CREATE INDEX IF NOT EXISTS "PipelineChannelConnection_channelId_isDefault_deletedAt_idx"
  ON "PipelineChannelConnection"("channelId", "isDefault", "deletedAt");

CREATE TABLE IF NOT EXISTS "ChannelTeamAccess" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChannelTeamAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelTeamAccess_channelId_teamId_key"
  ON "ChannelTeamAccess"("channelId", "teamId");

CREATE INDEX IF NOT EXISTS "ChannelTeamAccess_organizationId_idx"
  ON "ChannelTeamAccess"("organizationId");

CREATE INDEX IF NOT EXISTS "ChannelTeamAccess_teamId_idx"
  ON "ChannelTeamAccess"("teamId");

ALTER TABLE "ChannelTeamAccess"
  DROP CONSTRAINT IF EXISTS "ChannelTeamAccess_organizationId_fkey",
  DROP CONSTRAINT IF EXISTS "ChannelTeamAccess_channelId_fkey",
  DROP CONSTRAINT IF EXISTS "ChannelTeamAccess_teamId_fkey";

ALTER TABLE "ChannelTeamAccess"
  ADD CONSTRAINT "ChannelTeamAccess_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ChannelTeamAccess_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ChannelTeamAccess_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ChannelUserAccess" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChannelUserAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelUserAccess_channelId_userId_key"
  ON "ChannelUserAccess"("channelId", "userId");

CREATE INDEX IF NOT EXISTS "ChannelUserAccess_organizationId_idx"
  ON "ChannelUserAccess"("organizationId");

CREATE INDEX IF NOT EXISTS "ChannelUserAccess_userId_idx"
  ON "ChannelUserAccess"("userId");

ALTER TABLE "ChannelUserAccess"
  DROP CONSTRAINT IF EXISTS "ChannelUserAccess_organizationId_fkey",
  DROP CONSTRAINT IF EXISTS "ChannelUserAccess_channelId_fkey",
  DROP CONSTRAINT IF EXISTS "ChannelUserAccess_userId_fkey";

ALTER TABLE "ChannelUserAccess"
  ADD CONSTRAINT "ChannelUserAccess_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ChannelUserAccess_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ChannelUserAccess_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ProviderEventReceipt" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "externalMessageId" TEXT,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderEventReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProviderEventReceipt_channelId_externalEventId_key"
  ON "ProviderEventReceipt"("channelId", "externalEventId");

CREATE INDEX IF NOT EXISTS "ProviderEventReceipt_organizationId_idx"
  ON "ProviderEventReceipt"("organizationId");

CREATE INDEX IF NOT EXISTS "ProviderEventReceipt_channelId_externalMessageId_idx"
  ON "ProviderEventReceipt"("channelId", "externalMessageId");

ALTER TABLE "ProviderEventReceipt"
  DROP CONSTRAINT IF EXISTS "ProviderEventReceipt_organizationId_fkey",
  DROP CONSTRAINT IF EXISTS "ProviderEventReceipt_channelId_fkey";

ALTER TABLE "ProviderEventReceipt"
  ADD CONSTRAINT "ProviderEventReceipt_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "ProviderEventReceipt_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
