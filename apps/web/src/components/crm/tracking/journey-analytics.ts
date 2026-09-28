import type {
  JourneyAnalytics,
  JourneyBucketId,
  JourneyDistributionPoint,
  SalesTrackingData,
} from "./sales-tracking-types";
import { percentage } from "./tracking-format";

/**
 * Demonstrative journey depth for the current mock overview.
 * These figures are not derived from pageviews or channel revenue.
 */
export const JOURNEY_DEMO = {
  averageTouchpoints: 4.7,
  averageChannels: 2.3,
  averageTimeToPurchaseDays: 6.4,
  distribution: [
    { bucket: "1", label: "1 interação", percentage: 18.6 },
    { bucket: "2-3", label: "2–3 interações", percentage: 34.2 },
    { bucket: "4-5", label: "4–5 interações", percentage: 27.8 },
    { bucket: "6+", label: "6+ interações", percentage: 19.4 },
  ],
} as const satisfies {
  averageTouchpoints: number;
  averageChannels: number;
  averageTimeToPurchaseDays: number;
  distribution: JourneyDistributionPoint[];
};

const SPOKEN_BUCKET: Record<JourneyBucketId, string> = {
  "1": "1 interação",
  "2-3": "2 a 3 interações",
  "4-5": "4 a 5 interações",
  "6+": "6 ou mais interações",
};

export function journeyBucketAria(point: JourneyDistributionPoint) {
  return `${SPOKEN_BUCKET[point.bucket]}: ${percentage(point.percentage)} das compras`;
}

function hasValidPurchases(data: SalesTrackingData) {
  return data.overview.paidOrders > 0 || data.overview.netSales > 0;
}

/**
 * Presentation adapter. Real tracking should pass `data.journey` already consolidated
 * for the selected purchase window. The mock snapshot is only used while the page is demonstrative.
 */
export function journeyAnalyticsModel(data: SalesTrackingData): JourneyAnalytics {
  if (data.journey) return data.journey;
  if (data.source !== "mock") return { status: "unconfigured" };
  if (!hasValidPurchases(data)) return { status: "insufficient" };
  return {
    status: "ready",
    averageTouchpoints: JOURNEY_DEMO.averageTouchpoints,
    averageChannels: JOURNEY_DEMO.averageChannels,
    averageTimeToPurchaseDays: JOURNEY_DEMO.averageTimeToPurchaseDays,
    distribution: JOURNEY_DEMO.distribution.map((point) => ({ ...point })),
  };
}
