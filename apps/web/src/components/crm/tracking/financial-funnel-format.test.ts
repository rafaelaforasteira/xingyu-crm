import { describe, expect, it } from "vitest";
import {
  formatFunnelMoney,
  percentagePoints,
  realizationComparison,
} from "./financial-funnel-format";
import { getSalesTrackingData } from "./sales-tracking-service";

describe("Financial funnel presentation", () => {
  it("uses Brazilian compact currency while retaining meaningful million precision", () => {
    const normalized = (value: number | null) => formatFunnelMoney(value).replace(/\s/g, " ");
    expect(normalized(1087510)).toBe("R$ 1,09 mi");
    expect(normalized(-44400)).toBe("-R$ 44,4 mil");
    expect(normalized(-18762.25)).toBe("-R$ 18,8 mil");
    expect(normalized(1024347.75)).toBe("R$ 1,02 mi");
    expect(normalized(0)).toBe("R$ 0");
    expect(normalized(null)).toBe("—");
    expect(normalized(Infinity)).toBe("—");
  });

  it("compares actual realization rates, never net revenue growth", async () => {
    const { overview } = await getSalesTrackingData({
      period: { mode: "preset", preset: "30d" },
      customerType: "ALL",
      purchaseStage: "ALL",
    });
    const flow = overview.financialFlow;
    const result = realizationComparison(flow);
    expect(result.previousRate).toBeCloseTo(
      (flow.previousPeriod.netSales / flow.previousPeriod.grossSales) * 100,
    );
    expect(result.delta).toBeCloseTo(flow.realizationRate! - result.previousRate!);
    expect(result.delta).not.toBeCloseTo(flow.trends.netSales!.value);
    const example = realizationComparison({
      realizationRate: 94.2,
      previousPeriod: { ...flow.previousPeriod, netSales: 163, grossSales: 1000 },
    });
    expect(percentagePoints(example.delta)).toBe("+77,9 p.p.");
    expect(
      realizationComparison({
        realizationRate: 94.2,
        previousPeriod: { ...flow.previousPeriod, grossSales: 0 },
      }).delta,
    ).toBeNull();
    expect(
      realizationComparison({ realizationRate: null, previousPeriod: flow.previousPeriod }).delta,
    ).toBeNull();
    expect(percentagePoints(-0.001)).toBe("0,0 p.p.");
    expect(percentagePoints(-2.4)).toBe("-2,4 p.p.");
  });
});
