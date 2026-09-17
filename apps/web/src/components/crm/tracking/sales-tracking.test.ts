import { describe, expect, it } from "vitest";
import { createTrackingDataset, REACTIVATION_DAYS } from "./sales-tracking-mock";
import { resolveTrackingDateRange, timelineGranularity } from "./tracking-dates";
import { analyzeTrackingOverview, median, orderAsOf } from "./tracking-analytics";
import { overviewChannel } from "./tracking-dictionary";
import type { TrackingDataset, TrackingOrder } from "./tracking-analytics-types";
import type { TrackingFilters, SalesTrackingData } from "./sales-tracking-types";

const today = new Date(2026, 8, 15);
const base: TrackingFilters = {
  period: { mode: "preset", preset: "30d" },
  customerType: "ALL",
  purchaseStage: "ALL",
};
const identity = (id: string) => ({ id, name: id, email: id + "@example.test", phone: "" });
const order = (id: string, customerId: string, date: string, amount: number): TrackingOrder => ({
  id,
  customerId,
  date,
  paidAt: date,
  grossCents: amount * 100,
  adjustments: [],
});
function checkInvariants(data: SalesTrackingData) {
  const { overview: o, summary: s } = data;
  expect(o.grossSales).toBeGreaterThanOrEqual(o.netSales);
  expect(o.netSales).toBeCloseTo(o.grossSales - o.cancellations - o.refunds);
  expect(o.firstPurchaseRevenue + o.repeatRevenue).toBeCloseTo(o.netSales);
  expect(s.newRevenue + s.existingRevenue).toBeCloseTo(o.netSales);
  expect(s.newCustomers + s.existingCustomers).toBe(o.buyers);
  expect(data.channels.reduce((a, b) => a + b.netRevenue, 0)).toBeCloseTo(o.netSales);
  expect(data.attribution.attributedRevenue + data.attribution.unattributedRevenue).toBeCloseTo(
    o.netSales,
  );
  expect(data.customers.reduce((a, b) => a + b.periodRevenue, 0)).toBeCloseTo(o.netSales);
  expect(data.customers.reduce((a, b) => a + b.periodOrders, 0)).toBe(o.paidOrders);
  expect(data.purchaseStages.reduce((a, b) => a + b.orders, 0)).toBe(o.paidOrders);
  expect(data.purchaseStages.reduce((a, b) => a + b.revenue, 0)).toBeCloseTo(o.netSales);
  expect(data.overview.timeline.reduce((a, b) => a + b.netSales, 0)).toBeCloseTo(o.netSales);
  expect(data.overview.timeline.reduce((a, b) => a + b.grossSales, 0)).toBeCloseTo(o.grossSales);
  expect(data.overview.timeline.reduce((a, b) => a + b.paidOrders, 0)).toBe(o.paidOrders);
  if (data.reactivation.eligibleCustomers != null)
    expect(data.reactivation.reactivatedCustomers).toBeLessThanOrEqual(
      data.reactivation.eligibleCustomers,
    );
  else expect(data.reactivation.reactivationRate).toBeNull();
  expect(data.reactivation.reactivatedCustomers).toBe(
    data.customers.filter((customer) => customer.isReactivated).length,
  );
  for (const customer of data.customers) {
    expect(customer.periodOrders).toBeGreaterThan(0);
    expect(
      customer.lastPurchaseAt >= data.range.startDate &&
        customer.lastPurchaseAt <= data.range.endDate,
    ).toBe(true);
    expect(customer.lifetimeValue).toBeGreaterThanOrEqual(customer.periodRevenue);
    expect(customer.daysSinceLastPurchase).toBeGreaterThanOrEqual(0);
  }
}
describe("Tracking overview analytics", () => {
  it("keeps every section reconciled across all 84 filter combinations", () => {
    const dataset = createTrackingDataset(today);
    for (const preset of ["30d", "90d", "12m"] as const)
      for (const customerType of ["ALL", "NEW", "EXISTING", "REACTIVATED"] as const)
        for (const purchaseStage of ["ALL", "1", "2", "3", "4", "5", "6+"] as const) {
          const filters = {
            period: { mode: "preset" as const, preset },
            customerType,
            purchaseStage,
          };
          checkInvariants(
            analyzeTrackingOverview(
              dataset,
              filters,
              resolveTrackingDateRange(filters.period, today),
            ),
          );
        }
  });
  it("separates new-buyer revenue from first-purchase revenue, including under NEW filter", () => {
    const dataset: TrackingDataset = {
      customers: [identity("a"), identity("b")],
      orders: [
        order("1", "a", "2026-08-05", 100),
        order("2", "a", "2026-08-20", 200),
        order("3", "b", "2026-07-01", 500),
        order("4", "b", "2026-08-21", 300),
      ],
    };
    const range = { startDate: "2026-08-01", endDate: "2026-08-31" };
    const all = analyzeTrackingOverview(dataset, base, range);
    expect(all.summary.newRevenue).toBe(300);
    expect(all.overview.firstPurchaseRevenue).toBe(100);
    expect(all.overview.repeatRevenue).toBe(500);
    const newOnly = analyzeTrackingOverview(dataset, { ...base, customerType: "NEW" }, range);
    expect(newOnly.overview.repeatRevenue).toBe(200);
    expect(newOnly.summary.newCustomers).toBe(1);
    checkInvariants(newOnly);
  });
  it("calculates LTV as of cutoff and ignores both future purchases and future adjustments", () => {
    const first = order("1", "a", "2025-06-01", 5000);
    first.adjustments.push({ kind: "REFUND", date: "2026-03-05", cents: 100000 });
    const dataset = {
      customers: [identity("a")],
      orders: [first, order("2", "a", "2026-01-15", 2000), order("3", "a", "2026-03-01", 4000)],
    };
    const data = analyzeTrackingOverview(dataset, base, {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    expect(data.overview.averageLtv).toBe(7000);
    expect(data.customers[0]?.ordersCount).toBe(2);
    expect(data.customers[0]?.lastPurchaseAt).toBe("2026-01-15");
  });
  it("uses a real inactive eligible cohort, including customers who never returned", () => {
    const dataset = {
      customers: [identity("a"), identity("b"), identity("c")],
      orders: [
        order("1", "a", "2025-01-01", 100),
        order("2", "a", "2026-08-03", 100),
        order("3", "b", "2025-01-01", 100),
        order("4", "c", "2026-08-04", 100),
      ],
    };
    const data = analyzeTrackingOverview(
      dataset,
      { ...base, customerType: "REACTIVATED" },
      { startDate: "2026-08-01", endDate: "2026-08-31" },
    );
    expect(data.reactivation.eligibleCustomers).toBe(2);
    expect(data.reactivation.reactivationRate).toBe(50);
    expect(data.summary.newCustomers).toBe(0);
    expect(data.customers[0]).toMatchObject({ acquisitionType: "EXISTING", isReactivated: true });
    expect(REACTIVATION_DAYS).toBe(180);
  });
  it("uses only fully observed first-to-second cohorts and excludes single buyers from intervals", () => {
    const dataset = {
      customers: [identity("a"), identity("b"), identity("c")],
      orders: [
        order("1", "a", "2026-01-01", 100),
        order("2", "a", "2026-01-21", 100),
        order("3", "b", "2026-01-01", 100),
        order("4", "c", "2026-03-15", 100),
      ],
    };
    const data = analyzeTrackingOverview(dataset, base, {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });
    expect(data.firstToSecondConversion).toMatchObject({
      eligibleCustomers: 2,
      convertedCustomers: 1,
      rate: 50,
      observationWindowDays: 60,
    });
    expect(data.summary.averageRepurchaseDays).toBe(20);
    expect(data.summary.firstToSecondPurchaseDays).toBe(20);
    expect(median([10, 20, 90, 800])).toBe(55);
  });
  it("includes unidentifiable revenue without inventing platform/channel overlap", () => {
    const o = order("1", "a", "2026-08-01", 100);
    const data = analyzeTrackingOverview({ customers: [identity("a")], orders: [o] }, base, {
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    expect(data.attribution.attributedRevenueShare).toBe(0);
    expect(data.channels[0]).toMatchObject({
      channel: "UNIDENTIFIED",
      netRevenue: 100,
      revenueShare: 100,
    });
    expect(
      overviewChannel({
        channel: "PAID_SOCIAL",
        platform: "META",
        placement: "INSTAGRAM",
        touchModel: "RECORDED_ORIGIN",
      }),
    ).toBe("META_ADS");
    expect(
      overviewChannel({
        channel: "ORGANIC_SOCIAL",
        platform: "META",
        placement: "INSTAGRAM",
        touchModel: "RECORDED_ORIGIN",
      }),
    ).toBe("ORGANIC_SOCIAL");
  });
  it("keeps zero denominators unavailable and rejects impossible financial inputs", () => {
    const data = analyzeTrackingOverview({ customers: [], orders: [] }, base, {
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    expect(data.overview.averageTicket).toBeNull();
    expect(data.overview.realizationRate).toBeNull();
    expect(data.overview.averageRepurchaseDays).toBeNull();
    expect(data.attribution.attributedRevenueShare).toBeNull();
    expect(data.firstToSecondConversion?.rate).toBeNull();
    const bad = order("bad", "a", "2026-08-01", 100);
    bad.adjustments = [{ kind: "REFUND", date: "2026-08-01", cents: 10001 }];
    expect(() => orderAsOf(bad, "2026-08-31")).toThrow();
  });
  it("does not count cancelled or fully refunded sales as valid purchases", () => {
    const cancelled = order("1", "a", "2026-07-01", 100);
    cancelled.adjustments = [{ kind: "CANCELLATION", date: "2026-07-01", cents: 10000 }];
    const refunded = order("2", "a", "2026-07-02", 100);
    refunded.adjustments = [{ kind: "REFUND", date: "2026-07-02", cents: 10000 }];
    const data = analyzeTrackingOverview(
      {
        customers: [identity("a")],
        orders: [cancelled, refunded, order("3", "a", "2026-08-01", 200)],
      },
      base,
      { startDate: "2026-08-01", endDate: "2026-08-31" },
    );
    expect(data.overview.firstPurchaseRevenue).toBe(200);
    expect(data.customers[0]?.ordersCount).toBe(1);
  });
  it("normalizes calendar periods, validates custom dates and centralizes granularity", () => {
    expect(resolveTrackingDateRange(base.period, new Date(2026, 8, 11))).toEqual({
      startDate: "2026-08-13",
      endDate: "2026-09-11",
    });
    expect(
      resolveTrackingDateRange({ mode: "preset", preset: "12m" }, new Date(2024, 1, 29)),
    ).toEqual({ startDate: "2023-03-01", endDate: "2024-02-29" });
    for (const [startDate, endDate] of [
      ["2026-08-32", "2026-09-01"],
      ["2026-09-01", "2026-08-01"],
      ["2026-09-15", "2026-09-16"],
    ])
      expect(() =>
        resolveTrackingDateRange(
          { mode: "custom", startDate: startDate!, endDate: endDate! },
          today,
        ),
      ).toThrow();
    expect(timelineGranularity({ startDate: "2026-08-01", endDate: "2026-08-31" })).toBe("day");
    expect(timelineGranularity({ startDate: "2026-06-01", endDate: "2026-08-31" })).toBe("week");
    expect(timelineGranularity({ startDate: "2026-01-01", endDate: "2026-08-31" })).toBe("month");
  });
});
