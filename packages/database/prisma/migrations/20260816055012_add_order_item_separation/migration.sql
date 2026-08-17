-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "isSeparated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "separatedAt" TIMESTAMP(3);

-- RenameIndex
ALTER INDEX "Channel_org_provider_external_idx" RENAME TO "Channel_organizationId_provider_externalAccountId_idx";

-- RenameIndex
ALTER INDEX "Channel_org_status_deleted_idx" RENAME TO "Channel_organizationId_status_deletedAt_idx";

-- RenameIndex
ALTER INDEX "OrderStageDefinition_organizationId_active_archived_position_id" RENAME TO "OrderStageDefinition_organizationId_active_archived_positio_idx";

-- RenameIndex
ALTER INDEX "Pipeline_org_deleted_archived_favorite_idx" RENAME TO "Pipeline_organizationId_deletedAt_archived_favorite_idx";

-- RenameIndex
ALTER INDEX "PipelineChannelConnection_pipeline_deleted_active_idx" RENAME TO "PipelineChannelConnection_pipelineId_deletedAt_active_idx";

-- RenameIndex
ALTER INDEX "PipelineStage_pipeline_deleted_archived_position_idx" RENAME TO "PipelineStage_pipelineId_deletedAt_archived_position_idx";

-- RenameIndex
ALTER INDEX "PipelineStage_pipeline_type_idx" RENAME TO "PipelineStage_pipelineId_type_idx";
