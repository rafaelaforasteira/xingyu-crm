-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "nextLeadSequence" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN "leadSequence" INTEGER;

-- Backfill deterministic sequences per organization (createdAt ASC, id ASC)
WITH ordered AS (
  SELECT
    id,
    "organizationId",
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS seq
  FROM "Deal"
)
UPDATE "Deal" AS d
SET "leadSequence" = ordered.seq
FROM ordered
WHERE d.id = ordered.id;

-- Advance organization counters past the highest assigned sequence
UPDATE "Organization" AS o
SET "nextLeadSequence" = COALESCE(
  (
    SELECT MAX(d."leadSequence") + 1
    FROM "Deal" AS d
    WHERE d."organizationId" = o.id
      AND d."leadSequence" IS NOT NULL
  ),
  1
);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_organizationId_leadSequence_key"
ON "Deal"("organizationId", "leadSequence");
