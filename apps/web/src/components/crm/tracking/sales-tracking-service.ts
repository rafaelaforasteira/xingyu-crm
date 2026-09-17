import { createTrackingDataset } from "./sales-tracking-mock";
import { analyzeTrackingOverview } from "./tracking-analytics";
import { resolveTrackingDateRange } from "./tracking-dates";
import type { SalesTrackingData, TrackingFilters } from "./sales-tracking-types";
export { resolveTrackingDateRange } from "./tracking-dates";

/**
 * Future API boundary: Shopify orders must be normalized into FAROL analytics,
 * never consumed by UI components. Replace this adapter with the overview DTO.
 */
export async function getSalesTrackingData(filters: TrackingFilters): Promise<SalesTrackingData> {
  const today = new Date();
  const range = resolveTrackingDateRange(filters.period, today);
  return analyzeTrackingOverview(createTrackingDataset(today), filters, range, "mock");
}
export const getTrackingOverview = getSalesTrackingData;
