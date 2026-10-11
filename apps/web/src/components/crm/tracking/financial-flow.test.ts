import { describe, expect, it } from "vitest";
import {
  attributionTrends,
  coverageDeltaPoints,
  financialFlow,
  metricTrend,
  overviewTrends,
  previousEqualPeriod,
  safeRate,
} from "./financial-flow";
import { getSalesTrackingData } from "./sales-tracking-service";
import type { FinancialSnapshot, SalesComparison } from "./sales-tracking-types";
const snapshot: FinancialSnapshot = {
  grossSales: 2051901,
  cancellations: 131753,
  refunds: 77828,
  netSales: 1842320,
  recoverableAmount: 32450,
  recoveredAmount: 0,
};
const previous: SalesComparison = {
  ...snapshot,
  startDate: "2026-07-02",
  endDate: "2026-07-31",
  paidOrders: 10,
  buyers: 8,
  averageTicket: 100,
  averageLtv: 7000,
  averageRepurchaseDays: 53,
  repeatRevenue: 1000000,
  firstPurchaseRevenue: 100,
  reactivatedCustomers: 100,
};
describe("financial flow", () => {
  it("reconciles balances and uses the preceding stage as conversion denominator", () => {
    const flow = financialFlow(snapshot, previous);
    expect(flow.afterCancellations).toBe(1920148);
    expect(flow.afterRefunds).toBe(1842320);
    expect(flow.grossToAfterCancellationRate).toBeCloseTo(93.579, 2);
    expect(flow.afterCancellationToAfterRefundRate).toBeCloseTo(95.947, 2);
    expect(flow.realizationRate).toBeCloseTo(89.786, 2);
  });
  it("does not add pending or already normalized recovered revenue twice", () => {
    expect(financialFlow(snapshot, previous).netSales).toBe(snapshot.netSales);
    const recovered = { ...snapshot, recoveredAmount: 10000, netSales: snapshot.netSales + 10000 };
    expect(financialFlow(recovered, previous).netSales).toBe(recovered.netSales);
    expect(financialFlow(recovered, previous).recoveryRate).toBeCloseTo((10000 / 32450) * 100);
  });
  it("uses null for undefined rates and distinguishes unknown recovery from zero", () => {
    expect(safeRate(0, 0)).toBeNull();
    expect(safeRate(2, Infinity)).toBeNull();
    expect(metricTrend(50, 0)).toBeNull();
    const flow = financialFlow(
      {
        ...snapshot,
        grossSales: 0,
        cancellations: 0,
        refunds: 0,
        netSales: 0,
        recoverableAmount: null,
        recoveredAmount: null,
      },
      previous,
    );
    expect(flow.realizationRate).toBeNull();
    expect(flow.afterCancellationToAfterRefundRate).toBeNull();
    expect(flow.recoveryRate).toBeNull();
  });
  it("separates trend direction from sentiment", () => {
    expect(metricTrend(80, 100, true)).toMatchObject({ direction: "down", sentiment: "positive" });
    expect(metricTrend(120, 100, true)).toMatchObject({ direction: "up", sentiment: "negative" });
    expect(metricTrend(120, 100)).toMatchObject({ direction: "up", sentiment: "positive" });
    expect(metricTrend(100, 100)).toMatchObject({ direction: "flat", sentiment: "neutral" });
    const trends = overviewTrends(
      {
        netSales: 200,
        paidOrders: 329,
        buyers: 300,
        averageTicket: 3113.52,
        averageLtv: 1,
        averageRepurchaseDays: 10,
        repeatRevenue: 80,
        firstPurchaseRevenue: 120,
        reactivatedCustomers: 2,
      },
      {
        ...previous,
        netSales: 180,
        paidOrders: 301,
        buyers: 280,
        averageTicket: 2800,
      },
    );
    expect(trends.paidOrders?.value).toBeCloseTo(((329 - 301) / 301) * 100);
    expect(trends.buyers?.value).toBeCloseTo(((300 - 280) / 280) * 100);
    expect(trends.averageTicket?.direction).toBe("up");
    expect(trends.firstPurchaseRevenue).toMatchObject({ direction: "up", sentiment: "positive" });
    expect(trends.repeatRevenue).toMatchObject({ direction: "down", sentiment: "negative" });
    expect(
      overviewTrends(
        {
          netSales: 200,
          paidOrders: 4,
          buyers: 4,
          averageTicket: null,
          averageLtv: 1,
          averageRepurchaseDays: 10,
          repeatRevenue: 80,
          firstPurchaseRevenue: 50,
          reactivatedCustomers: 2,
        },
        { ...previous, paidOrders: 0, buyers: 0, averageTicket: null, firstPurchaseRevenue: 0 },
      ).paidOrders,
    ).toBeNull();
    expect(
      overviewTrends(
        {
          netSales: 200,
          paidOrders: 4,
          buyers: 4,
          averageTicket: null,
          averageLtv: 1,
          averageRepurchaseDays: 10,
          repeatRevenue: 80,
          firstPurchaseRevenue: 50,
          reactivatedCustomers: 2,
        },
        { ...previous, firstPurchaseRevenue: 0, repeatRevenue: 0 },
      ).firstPurchaseRevenue,
    ).toBeNull();
  });
  it("compares attribution revenue and treats unidentified growth as negative", () => {
    const trends = attributionTrends(
      { attributedRevenue: 80, unattributedRevenue: 40, attributedRevenueShare: 66.7 },
      { attributedRevenue: 100, unattributedRevenue: 20, attributedRevenueShare: 83.3 },
    );
    expect(trends.attributedRevenue).toMatchObject({ direction: "down", sentiment: "negative" });
    expect(trends.unattributedRevenue).toMatchObject({ direction: "up", sentiment: "negative" });
    expect(
      attributionTrends(
        { attributedRevenue: 120, unattributedRevenue: 10, attributedRevenueShare: 92.3 },
        { attributedRevenue: 100, unattributedRevenue: 20, attributedRevenueShare: 83.3 },
      ),
    ).toMatchObject({
      attributedRevenue: { direction: "up", sentiment: "positive" },
      unattributedRevenue: { direction: "down", sentiment: "positive" },
    });
    expect(
      attributionTrends(
        { attributedRevenue: 10, unattributedRevenue: 5, attributedRevenueShare: null },
        { attributedRevenue: 0, unattributedRevenue: 0, attributedRevenueShare: null },
      ),
    ).toEqual({ attributedRevenue: null, unattributedRevenue: null, coverageDeltaPoints: null });
    expect(trends.coverageDeltaPoints).toBeCloseTo(66.7 - 83.3);
  });
  it("reports attribution coverage change in percentage points", () => {
    expect(coverageDeltaPoints(92.9, 90.5)).toBeCloseTo(2.4);
    expect(coverageDeltaPoints(80, 91.7)).toBeCloseTo(-11.7);
    expect(coverageDeltaPoints(50, 50)).toBe(0);
    expect(coverageDeltaPoints(null, 40)).toBeNull();
    expect(coverageDeltaPoints(40, null)).toBeNull();
  });
  it("compares equal inclusive calendar periods across month and leap-year boundaries", () => {
    expect(previousEqualPeriod({ startDate: "2026-08-01", endDate: "2026-08-30" })).toEqual({
      startDate: "2026-07-02",
      endDate: "2026-07-31",
    });
    expect(previousEqualPeriod({ startDate: "2024-03-01", endDate: "2024-03-01" })).toEqual({
      startDate: "2024-02-29",
      endDate: "2024-02-29",
    });
  });
  it("scopes recovery, balances and chart dates to applied segment and range", async () => {
    const data = await getSalesTrackingData({
      period: { mode: "custom", startDate: "2026-08-05", endDate: "2026-08-06" },
      customerType: "REACTIVATED",
      purchaseStage: "2",
    });
    const flow = data.overview.financialFlow;
    expect(flow.grossSales).toBeLessThan(snapshot.grossSales);
    expect(flow.recoverableAmount).toBeLessThan(32450);
    expect(flow.netSales).toBe(flow.grossSales - flow.cancellations - flow.refunds);
    expect(flow.previousPeriod.startDate).toBe("2026-08-03");
    expect(flow.previousPeriod.endDate).toBe("2026-08-04");
    expect(data.overview.timeline.map((p) => p.date)).toEqual(["2026-08-05", "2026-08-06"]);
    expect(data.overview.timeline.reduce((sum, p) => sum + p.netSales, 0)).toBe(flow.netSales);
  });
});
