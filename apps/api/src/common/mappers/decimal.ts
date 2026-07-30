type DecimalLike = {
  toNumber: () => number;
};

function isDecimalLike(value: object): value is DecimalLike {
  return (
    "toNumber" in value &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  );
}

/** Coerce Prisma Decimal, string, or number into a finite number (else 0). */
export function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "object" && isDecimalLike(value)) {
    const parsed = value.toNumber();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
