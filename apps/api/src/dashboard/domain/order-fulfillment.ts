/**
 * Logistics metrics: delay vs stale tracking must stay separate.
 *
 * - Stale tracking: in-transit order whose last tracking/update is older than the threshold.
 * - Delayed: current time is past a reliable expected/promised delivery date.
 *
 * Missing expected dates must NOT be treated as delays.
 */

export const IN_TRANSIT_ORDER_STATUSES = [
  "LEFT_FACTORY",
  "INTERNATIONAL_TRANSPORT",
  "ARRIVED_BRAZIL",
  "NATIONAL_TRANSPORT",
] as const;

/** Initial alert threshold for "sem atualização de rastreio". */
export const TRACKING_STALE_DAYS = 3;

export function isInTransitStatus(status?: string | null): boolean {
  return IN_TRANSIT_ORDER_STATUSES.includes(
    (status ?? "") as (typeof IN_TRANSIT_ORDER_STATUSES)[number],
  );
}

export function isTrackingStale(input: {
  status?: string | null;
  lastTrackingAt?: Date | string | null;
  now?: Date;
  staleDays?: number;
}): boolean {
  if (!isInTransitStatus(input.status)) return false;
  if (!input.lastTrackingAt) return true;
  const at =
    typeof input.lastTrackingAt === "string"
      ? new Date(input.lastTrackingAt)
      : input.lastTrackingAt;
  if (Number.isNaN(at.getTime())) return true;
  const now = input.now ?? new Date();
  const days = input.staleDays ?? TRACKING_STALE_DAYS;
  return now.getTime() - at.getTime() > days * 86_400_000;
}

/**
 * Returns whether the order is delayed by expected date.
 * `null` means delay cannot be evaluated (no reliable expectedAt).
 */
export function isOrderDelayed(input: {
  expectedAt?: Date | string | null;
  now?: Date;
}): boolean | null {
  if (!input.expectedAt) return null;
  const at = typeof input.expectedAt === "string" ? new Date(input.expectedAt) : input.expectedAt;
  if (Number.isNaN(at.getTime())) return null;
  const now = input.now ?? new Date();
  return now.getTime() > at.getTime();
}

/**
 * Aggregate delayed count for a set of in-transit orders.
 * Returns `null` when none of the orders have a usable expected date.
 */
export function aggregateDelayedCount(
  orders: { expectedAt?: Date | string | null }[],
  now = new Date(),
): number | null {
  let evaluable = 0;
  let delayed = 0;
  for (const order of orders) {
    const result = isOrderDelayed({ expectedAt: order.expectedAt, now });
    if (result == null) continue;
    evaluable += 1;
    if (result) delayed += 1;
  }
  if (evaluable === 0) return null;
  return delayed;
}
