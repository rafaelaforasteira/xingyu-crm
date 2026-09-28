import { describe, expect, it } from "vitest";
import { createTrackingDataset } from "./sales-tracking-mock";
import { analyzeTrackingOverview } from "./tracking-analytics";
import { resolveTrackingDateRange } from "./tracking-dates";
import { JOURNEY_DEMO, journeyAnalyticsModel, journeyBucketAria } from "./journey-analytics";
import type { TrackingFilters } from "./sales-tracking-types";

const filters: TrackingFilters = {
  period: { mode: "preset", preset: "30d" },
  customerType: "ALL",
  purchaseStage: "ALL",
};

describe("journey analytics model", () => {
  it("uses the demonstrative snapshot when the mock period has valid purchases", () => {
    const data = analyzeTrackingOverview(
      createTrackingDataset(new Date(2026, 8, 15)),
      filters,
      resolveTrackingDateRange(filters.period, new Date(2026, 8, 15)),
      "mock",
    );
    const journey = journeyAnalyticsModel(data);
    expect(journey.status).toBe("ready");
    if (journey.status !== "ready") return;
    expect(journey.averageTouchpoints).toBe(4.7);
    expect(journey.averageChannels).toBe(2.3);
    expect(journey.averageTimeToPurchaseDays).toBe(6.4);
    expect(journey.distribution.reduce((sum, point) => sum + point.percentage, 0)).toBeCloseTo(100);
    expect(journey.distribution.map((point) => point.percentage)).toEqual([18.6, 34.2, 27.8, 19.4]);
  });

  it("does not invent a journey when the filtered period has no valid purchases", () => {
    const data = analyzeTrackingOverview(
      { customers: [], orders: [] },
      filters,
      resolveTrackingDateRange(filters.period, new Date(2026, 8, 15)),
      "mock",
    );
    expect(journeyAnalyticsModel(data)).toEqual({ status: "insufficient" });
  });

  it("stays unconfigured until analytics supplies a real journey", () => {
    const data = analyzeTrackingOverview(
      createTrackingDataset(new Date(2026, 8, 15)),
      filters,
      resolveTrackingDateRange(filters.period, new Date(2026, 8, 15)),
      "api",
    );
    expect(journeyAnalyticsModel(data)).toEqual({ status: "unconfigured" });
  });

  it("prefers a supplied journey over the demonstrative snapshot", () => {
    const data = analyzeTrackingOverview(
      createTrackingDataset(new Date(2026, 8, 15)),
      filters,
      resolveTrackingDateRange(filters.period, new Date(2026, 8, 15)),
      "mock",
    );
    const supplied = journeyAnalyticsModel({
      ...data,
      journey: { status: "insufficient" },
    });
    expect(supplied).toEqual({ status: "insufficient" });
  });

  it("describes each bucket without relying on bar length", () => {
    const point = JOURNEY_DEMO.distribution[1]!;
    expect(journeyBucketAria(point)).toBe("2 a 3 interações: 34,2% das compras");
  });
});
