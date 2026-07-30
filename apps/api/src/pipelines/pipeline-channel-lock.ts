import { Prisma } from "@xingyu/database";

/**
 * PostgreSQL's advisory lock function returns `void`, which Prisma cannot
 * deserialize directly. Casting it to text keeps the lock transactional while
 * returning a supported wire type.
 */
export async function acquirePipelineChannelIdentityLock(
  tx: Prisma.TransactionClient,
  lockKey: string,
) {
  await tx.$queryRaw<Array<{ locked: string }>>`
    SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text AS "locked"
  `;
}
