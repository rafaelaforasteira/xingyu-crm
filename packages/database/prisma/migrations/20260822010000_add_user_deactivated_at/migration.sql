-- AlterTable
ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_organizationId_status_deactivatedAt_idx" ON "User"("organizationId", "status", "deactivatedAt");
