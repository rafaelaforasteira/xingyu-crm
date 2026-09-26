import { describe, expect, it } from "vitest";
import {
  CHANNEL_COLORS,
  buildChannelOriginView,
  groupChannelBars,
  layoutTreemap,
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
      row("INSTAGRAM", 80, 70),
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
    expect(view.bars[0]?.color).toBe(CHANNEL_COLORS.META_ADS);
    expect(view.treemap.map((cell) => cell.channel)).toEqual([
      "META_ADS",
      "WHATSAPP",
      "GOOGLE_ADS",
      "UNIDENTIFIED",
    ]);
    expect(view.bars.find((row) => row.channel === "UNIDENTIFIED")?.color).toBe(
      CHANNEL_COLORS.UNIDENTIFIED,
    );
  });

  it("orders channels by current net revenue without mutating the source", () => {
    const channels = [
      row("META_ADS", 230, 200, 560),
      row("WHATSAPP", 250, 80, 560),
      row("GOOGLE_ADS", 80, 70, 560),
    ];
    const original = channels.map((item) => item.channel);
    const view = buildChannelOriginView(channels, 560);
    expect(channels.map((item) => item.channel)).toEqual(original);
    expect(view.bars.map((item) => item.channel)).toEqual(["WHATSAPP", "META_ADS", "GOOGLE_ADS"]);
    expect(view.champion?.channel).toBe("WHATSAPP");
    expect(view.treemap.map((cell) => cell.channel)).toEqual(["WHATSAPP", "META_ADS", "GOOGLE_ADS"]);
  });

  it("promotes the revenue leader and keeps growth on its own rule", () => {
    const view = buildChannelOriginView(
      [
        row("INSTAGRAM", 260, 40, 690),
        row("WHATSAPP", 200, 50, 690),
        row("META_ADS", 230, 220, 690),
      ],
      690,
    );
    expect(view.bars.map((item) => item.channel)).toEqual(["INSTAGRAM", "META_ADS", "WHATSAPP"]);
    expect(view.champion?.channel).toBe("INSTAGRAM");
    expect(view.fastestGrowth?.channel).toBe("INSTAGRAM");
  });

  it("sorts unidentified with the other channels by net revenue", () => {
    const grouped = groupChannelBars([
      row("META_ADS", 100),
      row("EMAIL", 20),
      row("UNIDENTIFIED", 80),
    ]);
    expect(grouped.map((item) => item.channel)).toEqual(["META_ADS", "UNIDENTIFIED", "EMAIL"]);
  });

  it("layouts a binary treemap with areas proportional to revenue", () => {
    const cells = [
      { channel: "META_ADS" as const, name: "Meta Ads", size: 50, fill: "a", share: 50 },
      { channel: "WHATSAPP" as const, name: "WhatsApp", size: 30, fill: "b", share: 30 },
      { channel: "GOOGLE_ADS" as const, name: "Google Ads", size: 20, fill: "c", share: 20 },
    ];
    const rects = layoutTreemap(cells, 100, 100, 0);
    const area = (rect: { width: number; height: number }) => rect.width * rect.height;
    const total = rects.reduce((sum, rect) => sum + area(rect), 0);
    expect(total).toBeCloseTo(10_000);
    expect(area(rects.find((rect) => rect.channel === "META_ADS")!)).toBeCloseTo(5_000);
    expect(area(rects.find((rect) => rect.channel === "WHATSAPP")!)).toBeCloseTo(3_000);
    expect(area(rects.find((rect) => rect.channel === "GOOGLE_ADS")!)).toBeCloseTo(2_000);
  });
});
