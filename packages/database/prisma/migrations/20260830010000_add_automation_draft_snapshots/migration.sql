CREATE TABLE "AutomationDraftSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationDraftSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationDraftSnapshot_automationId_revision_key" ON "AutomationDraftSnapshot"("automationId", "revision");
CREATE INDEX "AutomationDraftSnapshot_organizationId_automationId_createdAt_idx" ON "AutomationDraftSnapshot"("organizationId", "automationId", "createdAt");

ALTER TABLE "AutomationDraftSnapshot" ADD CONSTRAINT "AutomationDraftSnapshot_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AutomationDraftSnapshot" ADD CONSTRAINT "AutomationDraftSnapshot_automationId_fkey"
FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
