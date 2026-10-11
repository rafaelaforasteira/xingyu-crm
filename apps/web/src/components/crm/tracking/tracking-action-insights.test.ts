import { describe, expect, it } from "vitest";
import { dominantRepurchaseBucket, trackingActionInsights } from "./tracking-action-insights";
import type { RepurchaseTimeBucket, SalesTrackingData } from "./sales-tracking-types";

function bucket(label: string, percentage: number, customers = 10): RepurchaseTimeBucket {
  return { label, minDays: 0, maxDays: 30, customers, percentage, revenue: 100 };
}

function data(patch: Partial<SalesTrackingData> = {}): SalesTrackingData {
  return {
    repurchaseBuckets: [bucket("Até 30 dias", 18.6), bucket("91–180 dias", 32.6, 20)],
    reactivation: {
      eligibleCustomers: 44,
      reactivatedCustomers: 34,
      reactivationRate: 77.3,
      netRevenue: 114883.75,
      averageInactivityDays: 236,
    },
    attribution: {
      attributedRevenue: 900,
      attributedRevenueShare: 92.9,
      unattributedRevenue: 70,
      unattributedRevenueShare: 7.1,
      totalNetRevenue: 970,
      trends: { attributedRevenue: null, unattributedRevenue: null, coverageDeltaPoints: null },
    },
    ...patch,
  } as SalesTrackingData;
}

describe("tracking action insights", () => {
  it("picks the first repurchase bucket that holds the highest share", () => {
    const tied = [bucket("Até 30 dias", 40), bucket("31–60 dias", 40)];
    expect(dominantRepurchaseBucket(tied)?.label).toBe("Até 30 dias");
    expect(dominantRepurchaseBucket([bucket("Até 30 dias", 0, 0)])).toBeNull();
  });

  it("builds at most three dynamic actions from existing analytics", () => {
    const insights = trackingActionInsights(data());
    expect(insights.map((item) => item.id)).toEqual([
      "repurchase-window",
      "reactivation",
      "attribution-gap",
    ]);
    expect(insights[0]?.title).toBe("Sua principal janela de recompra está entre 91 e 180 dias");
    expect(insights[0]?.description).toBe("32,6% das recompras acontecem nessa faixa.");
    expect(insights[0]?.actionHref).toBe("/repurchase");
    expect(insights[1]?.title).toContain("34 clientes");
    expect(insights[1]?.actionHref).toBe("/reactivation");
    expect(insights[2]?.title).toBe("7,1% da receita está sem origem identificada");
    expect(insights[2]?.actionHref).toBe("#tracking-sales-origin");
  });

  it("omits insights the analytics cannot support", () => {
    const insights = trackingActionInsights(
      data({
        repurchaseBuckets: [bucket("Até 30 dias", 0, 0)],
        reactivation: {
          eligibleCustomers: null,
          reactivatedCustomers: 0,
          reactivationRate: null,
          netRevenue: 0,
          averageInactivityDays: null,
        },
        attribution: {
          attributedRevenue: 100,
          attributedRevenueShare: 100,
          unattributedRevenue: 0,
          unattributedRevenueShare: 0,
          totalNetRevenue: 100,
          trends: { attributedRevenue: null, unattributedRevenue: null, coverageDeltaPoints: null },
        },
      }),
    );
    expect(insights).toEqual([]);
  });
});
