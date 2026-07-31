import { PrismaClient } from "@xingyu/database";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { acquirePipelineChannelIdentityLock } from "./pipeline-channel-lock";

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../../packages/database/.env"),
    resolve(process.cwd(), "../../.env.example"),
  ];
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const match = readFileSync(candidate, "utf8").match(/^DATABASE_URL\s*=\s*(.+)$/m);
    if (!match?.[1]) continue;
    process.env.DATABASE_URL = match[1].trim().replace(/^(['"])(.*)\1$/, "$2");
    return;
  }
  throw new Error("DATABASE_URL is required for the pipeline channel lock integration test");
}

describe("pipeline channel PostgreSQL advisory lock", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    ensureDatabaseUrl();
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("projects pg_advisory_xact_lock void as a Prisma-supported scalar", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await acquirePipelineChannelIdentityLock(
          tx,
          `pipeline-channel-integration:${process.pid}:${Date.now()}`,
        );
        return true;
      }),
    ).resolves.toBe(true);
  });
});
