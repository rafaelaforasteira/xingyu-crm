-- Lifecycle actions are an append-only record of reactivation and repurchase
-- decisions. Existing contacts, deals, conversations, and activities are not
-- rewritten or backfilled by this migration.
CREATE TYPE "LifecycleKind" AS ENUM ('REACTIVATION', 'REPURCHASE');
CREATE TYPE "LifecycleActionType" AS ENUM ('APPROACHED', 'POSTPONED', 'DISCARDED', 'CONVERTED');

CREATE TABLE "LifecycleAction" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "actorId" TEXT,
  "kind" "LifecycleKind" NOT NULL,
  "action" "LifecycleActionType" NOT NULL,
  "reason" TEXT,
  "snoozedUntil" TIMESTAMP(3),
  "dealId" TEXT,
  "conversationId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LifecycleAction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LifecycleAction_postponed_requires_future_snooze_check"
    CHECK (
      "action" <> 'POSTPONED'
      OR ("snoozedUntil" IS NOT NULL AND "snoozedUntil" > "createdAt")
    ),
  CONSTRAINT "LifecycleAction_discarded_requires_reason_check"
    CHECK ("action" <> 'DISCARDED' OR NULLIF(BTRIM("reason"), '') IS NOT NULL),
  CONSTRAINT "LifecycleAction_converted_requires_deal_check"
    CHECK ("action" <> 'CONVERTED' OR "dealId" IS NOT NULL)
);

ALTER TABLE "LifecycleAction"
  ADD CONSTRAINT "LifecycleAction_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "LifecycleAction_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "LifecycleAction_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "LifecycleAction_dealId_fkey"
    FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "LifecycleAction_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "LifecycleAction_dealId_key"
  ON "LifecycleAction"("dealId");
CREATE INDEX "LifecycleAction_latest_idx"
  ON "LifecycleAction"("organizationId", "contactId", "kind", "createdAt");
CREATE INDEX "LifecycleAction_queue_idx"
  ON "LifecycleAction"("organizationId", "kind", "action", "snoozedUntil");
CREATE INDEX "LifecycleAction_conversationId_idx"
  ON "LifecycleAction"("conversationId");

-- Only lifecycle-created reactivation deals are unique. Other CRM workflows
-- may legitimately keep more than one open deal for the same contact.
CREATE UNIQUE INDEX "Deal_one_open_reactivation_per_contact_idx"
  ON "Deal"("organizationId", "contactId")
  WHERE "deletedAt" IS NULL
    AND "status" = 'OPEN'
    AND "source" = 'REACTIVATION'
    AND "contactId" IS NOT NULL;

-- Supports the existing-open-deal guard without imposing global uniqueness on
-- ordinary sales, repurchase, or after-sales deals.
CREATE INDEX "Deal_open_contact_lookup_idx"
  ON "Deal"("organizationId", "contactId", "createdAt" DESC, "id")
  WHERE "deletedAt" IS NULL
    AND "status" = 'OPEN'
    AND "contactId" IS NOT NULL;
