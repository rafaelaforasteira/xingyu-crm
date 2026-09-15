import { describe, expect, it } from "vitest";
import { financialFlow, metricTrend, previousEqualPeriod, safeRate } from "./financial-flow";
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
  averageLtv: 7000,
  averageRepurchaseDays: 53,
  repeatRevenue: 1000000,
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
