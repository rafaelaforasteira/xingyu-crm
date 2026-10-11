import { DAY_MS } from "./recovery.config";
export const cents = (n: unknown): n is number => Number.isSafeInteger(n) && Number(n) >= 0;
/** Adapter boundary for provider decimal strings; never round through binary Float. */
export function decimalStringToCents(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match)
    throw new Error("Expected a nonnegative decimal string with at most two decimal places");
  const amount = BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0"));
  if (amount > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("Monetary value exceeds safe integer range");
  return Number(amount);
}
export function sumCents(values: number[]): number {
  const total = values.reduce((sum, value) => {
    if (!cents(value)) throw new Error("Invalid normalized monetary value");
    return sum + value;
  }, 0);
  if (!cents(total)) throw new Error("Monetary total exceeds safe integer range");
  return total;
}
export const rate = (n: number, d: number): number | null => (d > 0 ? (n / d) * 100 : null);
export const mean = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b),
    mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
export function wilson(positive: number, total: number): [number, number] | null {
  if (!total) return null;
  const z = 1.96,
    p = positive / total,
    factor = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / factor;
  const margin = (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) / factor;
  return [Math.max(0, center - margin) * 100, Math.min(1, center + margin) * 100];
}
const dateFormatters = new Map<string, Intl.DateTimeFormat>();
export function businessDate(iso: string, timezone: string): string {
  if (!dateFormatters.has(timezone))
    dateFormatters.set(
      timezone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    );
  const parts = dateFormatters.get(timezone)!.formatToParts(new Date(iso));
  const part = (key: string) => parts.find((p) => p.type === key)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function shiftDate(date: string, days: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") + days * DAY_MS).toISOString().slice(0, 10);
}
export function previousRange(startDate: string, endDate: string) {
  const days = Math.round((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS) + 1;
  return { startDate: shiftDate(startDate, -days), endDate: shiftDate(startDate, -1) };
}
export function allocateCents(total: number, weights: number[]): number[] {
  if (!weights.length) return [];
  const sum = sumCents(weights);
  const effective = sum ? weights : weights.map(() => 1),
    denominator = sum || weights.length;
  // BigInt keeps the financial allocation exact even for large integer amounts.
  const parts = effective.map((w) => Number((BigInt(total) * BigInt(w)) / BigInt(denominator)));
  let remainder = total - sumCents(parts);
  const ranked = effective
    .map((w, i) => ({ i, remainder: (BigInt(total) * BigInt(w)) % BigInt(denominator) }))
    .sort((a, b) => (a.remainder === b.remainder ? a.i - b.i : a.remainder > b.remainder ? -1 : 1));
  for (const part of ranked) {
    if (!remainder) break;
    parts[part.i]++;
    remainder--;
  }
  return parts;
}
