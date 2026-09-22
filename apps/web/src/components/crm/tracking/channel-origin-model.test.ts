import { describe, expect, it } from "vitest";
import {
  buildChannelOriginView,
  groupChannelBars,
  MAX_CHANNEL_BARS,
} from "./channel-origin-model";
import type { TrackingChannel, TrackingChannelRow } from "./tracking-analytics-types";

function row(
  channel: TrackingChannel,
  netRevenue: number,
  previousNetRevenue = 0,
  total = 1000,
): TrackingChannelRow {
  return {
    channel,
    netRevenue,
    previousNetRevenue,
    revenueShare: total ? (netRevenue / total) * 100 : 0,
    orders: 1,
    buyers: 1,
    newCustomers: 0,
    averageTicket: netRevenue,
  };
}

describe("channel origin view", () => {
  it("groups overflow channels into Outros and keeps unidentified visible", () => {
    const channels = [
      row("META_ADS", 300, 200),
      row("WHATSAPP", 180, 100),
      row("GOOGLE_ADS", 120, 90),
      row("ORGANIC_SOCIAL", 80, 70),
      row("REFERRAL", 70, 40),
      row("EMAIL", 50, 45),
      row("DIRECT", 40, 30),
      row("OTHER", 20, 10),
      row("UNIDENTIFIED", 90, 80),
    ];
    const grouped = groupChannelBars(channels, MAX_CHANNEL_BARS);
    expect(grouped).toHaveLength(8);
    expect(grouped.some((item) => item.channel === "OTHER")).toBe(true);
    expect(grouped.some((item) => item.channel === "UNIDENTIFIED")).toBe(true);
    expect(grouped.find((item) => item.channel === "OTHER")?.netRevenue).toBe(60);
  });

  it("picks champion, fastest growth and top 3 share", () => {
    const channels = [
      row("META_ADS", 400, 350, 800),
      row("WHATSAPP", 250, 100, 800),
      row("GOOGLE_ADS", 100, 120, 800),
      row("UNIDENTIFIED", 50, 50, 800),
    ];
    const view = buildChannelOriginView(channels, 800);
    expect(view.champion?.channel).toBe("META_ADS");
    expect(view.fastestGrowth?.channel).toBe("WHATSAPP");
    expect(view.top3Share).toBeCloseTo(93.75);
    expect(view.bars[0]?.isChampion).toBe(true);
    expect(view.bars[0]?.color).toContain("success");
  });
});
