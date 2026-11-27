CREATE TYPE "PipelineAccessMode" AS ENUM ('ORGANIZATION', 'RESTRICTED');

ALTER TABLE "Pipeline"
ADD COLUMN "accessMode" "PipelineAccessMode" NOT NULL DEFAULT 'ORGANIZATION';

CREATE TABLE "PipelineTeamAccess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PipelineTeamAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PipelineUserAccess" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PipelineUserAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PipelineTeamAccess_pipelineId_teamId_key" ON "PipelineTeamAccess"("pipelineId", "teamId");
CREATE INDEX "PipelineTeamAccess_organizationId_teamId_idx" ON "PipelineTeamAccess"("organizationId", "teamId");
CREATE INDEX "PipelineTeamAccess_organizationId_pipelineId_idx" ON "PipelineTeamAccess"("organizationId", "pipelineId");
CREATE UNIQUE INDEX "PipelineUserAccess_pipelineId_userId_key" ON "PipelineUserAccess"("pipelineId", "userId");
CREATE INDEX "PipelineUserAccess_organizationId_userId_idx" ON "PipelineUserAccess"("organizationId", "userId");
CREATE INDEX "PipelineUserAccess_organizationId_pipelineId_idx" ON "PipelineUserAccess"("organizationId", "pipelineId");

ALTER TABLE "PipelineTeamAccess" ADD CONSTRAINT "PipelineTeamAccess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PipelineTeamAccess" ADD CONSTRAINT "PipelineTeamAccess_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineTeamAccess" ADD CONSTRAINT "PipelineTeamAccess_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineUserAccess" ADD CONSTRAINT "PipelineUserAccess_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PipelineUserAccess" ADD CONSTRAINT "PipelineUserAccess_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PipelineUserAccess" ADD CONSTRAINT "PipelineUserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
