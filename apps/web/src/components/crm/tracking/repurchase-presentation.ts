import type { RepurchaseTimeBucket } from "./sales-tracking-types";

/** Reads the existing open-ended 180+ bucket; never invents a missing share. */
export function lateRepurchaseShare(buckets: RepurchaseTimeBucket[]) {
  if (!buckets.some((bucket) => bucket.customers > 0)) return null;
  return buckets.find((bucket) => bucket.minDays >= 180 && bucket.maxDays == null)?.percentage ?? null;
}
