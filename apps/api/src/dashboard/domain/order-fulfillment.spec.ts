import {
  aggregateDelayedCount,
  isOrderDelayed,
  isTrackingStale,
  TRACKING_STALE_DAYS,
} from "./order-fulfillment";

describe("order fulfillment metrics", () => {
  const now = new Date("2026-07-31T12:00:00.000Z");

  it("flags stale tracking for in-transit orders without recent updates", () => {
    expect(
      isTrackingStale({
        status: "NATIONAL_TRANSPORT",
        lastTrackingAt: new Date("2026-07-20T12:00:00.000Z"),
        now,
        staleDays: TRACKING_STALE_DAYS,
      }),
    ).toBe(true);
  });

  it("does not treat fresh updates as stale", () => {
    expect(
      isTrackingStale({
        status: "NATIONAL_TRANSPORT",
        lastTrackingAt: new Date("2026-07-30T12:00:00.000Z"),
        now,
      }),
    ).toBe(false);
  });

  it("detects real delays from expectedAt", () => {
    expect(isOrderDelayed({ expectedAt: "2026-07-30T00:00:00.000Z", now })).toBe(true);
    expect(isOrderDelayed({ expectedAt: "2026-08-02T00:00:00.000Z", now })).toBe(false);
  });

  it("returns null delay when expectedAt is missing", () => {
    expect(isOrderDelayed({ expectedAt: null, now })).toBeNull();
  });

  it("aggregates delayed count as null when no expected dates exist", () => {
    expect(
      aggregateDelayedCount([{ expectedAt: null }, { expectedAt: undefined }], now),
    ).toBeNull();
  });

  it("counts only evaluable delayed orders", () => {
    expect(
      aggregateDelayedCount(
        [
          { expectedAt: "2026-07-20T00:00:00.000Z" },
          { expectedAt: null },
          { expectedAt: "2026-08-10T00:00:00.000Z" },
        ],
        now,
      ),
    ).toBe(1);
  });
});
