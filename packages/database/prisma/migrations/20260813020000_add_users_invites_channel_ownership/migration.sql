CREATE TYPE "ChannelAccessMode" AS ENUM ('ORGANIZATION', 'PIPELINE', 'PERSONAL');

ALTER TABLE "Channel"
  ADD COLUMN "accessMode" "ChannelAccessMode" NOT NULL DEFAULT 'ORGANIZATION',
  ADD COLUMN "ownerUserId" TEXT;

ALTER TABLE "Channel"
  ADD CONSTRAINT "Channel_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Channel_organizationId_accessMode_ownerUserId_idx"
  ON "Channel"("organizationId", "accessMode", "ownerUserId");

CREATE TABLE "UserInvite" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserInvite_tokenHash_key" ON "UserInvite"("tokenHash");
CREATE INDEX "UserInvite_organizationId_userId_idx" ON "UserInvite"("organizationId", "userId");
CREATE INDEX "UserInvite_userId_usedAt_revokedAt_idx" ON "UserInvite"("userId", "usedAt", "revokedAt");
CREATE INDEX "UserInvite_expiresAt_idx" ON "UserInvite"("expiresAt");

ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInvite" ADD CONSTRAINT "UserInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
