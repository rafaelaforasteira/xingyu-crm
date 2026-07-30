-- Extend the existing Channel model to act as the shared integration account.
-- This is additive: SITE_CHAT and every existing channel row remain valid.
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'WEB_CHAT';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'SHOPIFY';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'FORM';
ALTER TYPE "ChannelType" ADD VALUE IF NOT EXISTS 'WEBHOOK';

CREATE TYPE "PipelineDuplicateStrategy" AS ENUM ('MERGE', 'CREATE_NEW', 'REJECT');
CREATE TYPE "PipelineRoutingMode" AS ENUM ('PIPELINE_DEFAULTS', 'FIXED', 'ROUND_ROBIN');

ALTER TABLE "Channel"
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "externalAccountId" TEXT,
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "secretReference" TEXT,
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastErrorAt" TIMESTAMP(3),
  ADD COLUMN "lastErrorMessage" TEXT;

CREATE TABLE "PipelineChannelConnection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  "defaultStageId" TEXT,
  "defaultOwnerId" TEXT,
  "defaultTeamId" TEXT,
  "defaultTagIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "source" TEXT,
  "campaignId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createContact" BOOLEAN NOT NULL DEFAULT true,
  "createConversation" BOOLEAN NOT NULL DEFAULT true,
  "createDeal" BOOLEAN NOT NULL DEFAULT true,
  "duplicateStrategy" "PipelineDuplicateStrategy" NOT NULL DEFAULT 'MERGE',
  "routingMode" "PipelineRoutingMode" NOT NULL DEFAULT 'PIPELINE_DEFAULTS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "PipelineChannelConnection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PipelineChannelConnection"
  ADD CONSTRAINT "PipelineChannelConnection_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PipelineChannelConnection_pipelineId_fkey"
    FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "PipelineChannelConnection_channelId_fkey"
    FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PipelineChannelConnection_defaultStageId_fkey"
    FOREIGN KEY ("defaultStageId") REFERENCES "PipelineStage"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PipelineChannelConnection_defaultOwnerId_fkey"
    FOREIGN KEY ("defaultOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PipelineChannelConnection_defaultTeamId_fkey"
    FOREIGN KEY ("defaultTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "PipelineChannelConnection_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Channel_org_status_deleted_idx"
  ON "Channel"("organizationId", "status", "deletedAt");
CREATE INDEX "Channel_org_provider_external_idx"
  ON "Channel"("organizationId", "provider", "externalAccountId");
CREATE INDEX "PipelineChannelConnection_organizationId_idx"
  ON "PipelineChannelConnection"("organizationId");
CREATE INDEX "PipelineChannelConnection_pipeline_deleted_active_idx"
  ON "PipelineChannelConnection"("pipelineId", "deletedAt", "active");
CREATE INDEX "PipelineChannelConnection_channelId_idx"
  ON "PipelineChannelConnection"("channelId");
CREATE INDEX "PipelineChannelConnection_defaultStageId_idx"
  ON "PipelineChannelConnection"("defaultStageId");
CREATE INDEX "PipelineChannelConnection_defaultOwnerId_idx"
  ON "PipelineChannelConnection"("defaultOwnerId");
CREATE INDEX "PipelineChannelConnection_defaultTeamId_idx"
  ON "PipelineChannelConnection"("defaultTeamId");
CREATE INDEX "PipelineChannelConnection_campaignId_idx"
  ON "PipelineChannelConnection"("campaignId");

-- A partial unique index permits reconnecting after a soft disconnect while
-- preventing two live routes for the same account and pipeline.
CREATE UNIQUE INDEX "PipelineChannelConnection_one_active_account_idx"
  ON "PipelineChannelConnection"("pipelineId", "channelId")
  WHERE "deletedAt" IS NULL;
