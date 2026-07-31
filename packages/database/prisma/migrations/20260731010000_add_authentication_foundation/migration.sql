-- CreateEnum
CREATE TYPE "AuthRole" AS ENUM ('ADMIN', 'MANAGER', 'CONSULTANT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authRole" "AuthRole" NOT NULL DEFAULT 'CONSULTANT',
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_authRole_idx" ON "User"("authRole");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE INDEX "UserSession_revokedAt_idx" ON "UserSession"("revokedAt");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill auth roles from existing CRM Role slugs where possible
UPDATE "User" AS u
SET "authRole" = CASE r.slug
  WHEN 'admin' THEN 'ADMIN'::"AuthRole"
  WHEN 'manager' THEN 'MANAGER'::"AuthRole"
  WHEN 'consultant' THEN 'CONSULTANT'::"AuthRole"
  ELSE 'CONSULTANT'::"AuthRole"
END
FROM "Role" AS r
WHERE u."roleId" = r.id;
