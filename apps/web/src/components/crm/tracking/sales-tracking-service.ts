import { api, ApiError } from "@/lib/api";
import { createTrackingDataset } from "./sales-tracking-mock";
import { analyzeTrackingOverview } from "./tracking-analytics";
import { resolveTrackingDateRange } from "./tracking-dates";
import type { TrackingDataset } from "./tracking-analytics-types";
import type { SalesTrackingData, TrackingFilters } from "./sales-tracking-types";

export { resolveTrackingDateRange } from "./tracking-dates";

type TrackingOverviewApiResponse =
  | {
      source: "shopify";
      dataset: TrackingDataset;
      fetchedAt: string;
      orderCount: number;
      shopDomain: string | null;
    }
  | {
      source: "unconfigured";
      errorCode: string;
      errorMessage: string;
      fetchedAt: string;
    }
  | {
      source: "error";
      errorCode: string;
      errorMessage: string;
      fetchedAt: string;
    };

function mockOverview(filters: TrackingFilters): SalesTrackingData {
  const today = new Date();
  const range = resolveTrackingDateRange(filters.period, today);
  return analyzeTrackingOverview(createTrackingDataset(today), filters, range, "mock");
}

/**
 * Loads Visão Geral from Shopify (live) when configured; otherwise falls back to demo mock.
 * Shopify orders are normalized server-side into FAROL TrackingDataset; analytics stay on the client.
 */
export async function getSalesTrackingData(
  filters: TrackingFilters,
): Promise<SalesTrackingData> {
  const today = new Date();
  const range = resolveTrackingDateRange(filters.period, today);

  try {
    const response = await api.get<TrackingOverviewApiResponse>(
      "/tracking/overview",
      undefined,
      { timeoutMs: 90_000 },
    );

    if (response.source === "shopify" && response.dataset) {
      return analyzeTrackingOverview(response.dataset, filters, range, "api");
    }

    // unconfigured or Shopify error → keep demonstrative data available
    return mockOverview(filters);
  } catch (error) {
    // Auth/session errors should surface; network/API issues fall back to mock.
    if (error instanceof ApiError && error.status === 401) throw error;
    return mockOverview(filters);
  }
}

export const getTrackingOverview = getSalesTrackingData;
