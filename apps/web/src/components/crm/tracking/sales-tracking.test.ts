import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSalesTrackingMock, REACTIVATION_DAYS } from "./sales-tracking-mock";
import { getSalesTrackingData, resolveTrackingDateRange } from "./sales-tracking-service";

describe("sales tracking", () => {
  it("provides three coherent period scenarios", () => {
    const month = getSalesTrackingMock("30d");
    const quarter = getSalesTrackingMock("90d");
    const year = getSalesTrackingMock("12m");
    expect(month.source).toBe("mock");
    expect(month.customers.length).toBeGreaterThanOrEqual(12);
    expect(month.summary.periodRevenue).toBeLessThan(quarter.summary.periodRevenue);
    expect(quarter.summary.periodRevenue).toBeLessThan(year.summary.periodRevenue);
  });

  it("keeps revenue composition and repurchase buckets consistent", () => {
    const data = getSalesTrackingMock("30d");
    expect(data.summary.newRevenue + data.summary.repeatRevenue).toBe(data.summary.periodRevenue);
    expect(data.summary.newRevenuePercentage + data.summary.repeatRevenuePercentage).toBe(100);
    expect(data.repurchaseBuckets.reduce((sum, bucket) => sum + bucket.percentage, 0)).toBe(100);
    expect(data.overview.netSales).toBe(
      data.overview.grossSales - data.overview.cancellations - data.overview.refunds,
    );
    expect(data.overview.realizationRate).toBeCloseTo(
      (data.overview.netSales / data.overview.grossSales) * 100,
    );
    expect(data.overview.firstPurchaseRevenue + data.overview.repeatRevenue).toBe(
      data.overview.netSales,
    );
    expect(data.overview.timeline.length).toBeGreaterThan(10);
  });

  it("uses a configurable reactivation threshold", () => {
    expect(REACTIVATION_DAYS).toBe(180);
  });

  it("maps presets and custom periods to API-ready date ranges", () => {
    expect(
      resolveTrackingDateRange({ mode: "preset", preset: "30d" }, new Date(2026, 8, 11)),
    ).toEqual({ startDate: "2026-08-13", endDate: "2026-09-11" });
    expect(
      resolveTrackingDateRange({
        mode: "custom",
        startDate: "2026-08-05",
        endDate: "2026-08-24",
      }),
    ).toEqual({ startDate: "2026-08-05", endDate: "2026-08-24" });
  });

  it("keeps fifth and sixth-or-later purchases as separate filters", async () => {
    const base = {
      period: { mode: "preset" as const, preset: "30d" as const },
      customerType: "ALL" as const,
    };
    const fifth = await getSalesTrackingData({ ...base, purchaseStage: "5" });
    const sixth = await getSalesTrackingData({ ...base, purchaseStage: "6+" });
    expect(fifth.customers.every((customer) => customer.purchaseStage === 5)).toBe(true);
    expect(sixth.customers.every((customer) => customer.purchaseStage >= 6)).toBe(true);
  });

  it("applies customer filters to the complete sales overview", async () => {
    const all = await getSalesTrackingData({
      period: { mode: "preset", preset: "30d" },
      customerType: "ALL",
      purchaseStage: "ALL",
    });
    const reactivated = await getSalesTrackingData({
      period: { mode: "preset", preset: "30d" },
      customerType: "REACTIVATED",
      purchaseStage: "ALL",
    });
    expect(reactivated.overview.netSales).toBeLessThan(all.overview.netSales);
    expect(
      reactivated.overview.timeline.every((point) => point.netSales < all.overview.netSales),
    ).toBe(true);
    expect(reactivated.overview.firstPurchaseRevenue).toBe(0);
    expect(reactivated.overview.repeatRevenue).toBe(reactivated.overview.netSales);
  });

  it("keeps UI architecture separated from mock and Shopify payloads", () => {
    const service = fs.readFileSync(path.join(__dirname, "sales-tracking-service.ts"), "utf8");
    const page = fs.readFileSync(path.join(__dirname, "sales-tracking-page.tsx"), "utf8");
    const periodSelector = fs.readFileSync(
      path.join(__dirname, "tracking-period-selector.tsx"),
      "utf8",
    );
    expect(service).toContain("getSalesTrackingData");
    expect(service).toContain("normalized into");
    expect(page).toContain("SalesTrackingFilters");
    expect(periodSelector).toContain("Últimos 30 dias");
    expect(periodSelector).toContain("Últimos 90 dias");
    expect(periodSelector).toContain("Últimos 12 meses");
    expect(page).not.toContain('label="Produto"');
    expect(page).not.toContain('label="Estado"');
    expect(page).not.toContain('label="Vendedora"');
  });
});
