import { PrismaClient } from "@xingyu/database";
import { configureTestDatabase } from "../common/test-database";

import { acquirePipelineChannelIdentityLock } from "./pipeline-channel-lock";

describe("pipeline channel PostgreSQL advisory lock", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    configureTestDatabase();
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma?.$disconnect();
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
