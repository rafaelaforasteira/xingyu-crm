type SequenceClient = {
  $queryRaw: <T = unknown>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<T>;
};

/**
 * Atomically allocates the next permanent lead sequence for an organization.
 * Uses UPDATE … RETURNING so concurrent creates never share the same number.
 */
export async function allocateLeadSequence(
  tx: SequenceClient,
  organizationId: string,
): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ seq: number }>>`
    UPDATE "Organization"
    SET "nextLeadSequence" = "nextLeadSequence" + 1
    WHERE "id" = ${organizationId}
    RETURNING ("nextLeadSequence" - 1)::int AS seq
  `;

  const seq = rows[0]?.seq;
  if (typeof seq !== "number" || !Number.isInteger(seq) || seq < 1) {
    throw new Error(
      `Failed to allocate leadSequence for organization ${organizationId}`,
    );
  }
  return seq;
}

export function formatLeadCode(sequence: number | null | undefined): string | null {
  if (typeof sequence !== "number" || !Number.isFinite(sequence) || sequence < 1) {
    return null;
  }
  return `Lead #${String(Math.trunc(sequence)).padStart(4, "0")}`;
}
