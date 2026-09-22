import { safeRate } from "./financial-flow";
import { CHANNEL_LABELS } from "./tracking-dictionary";
import type { TrackingChannel, TrackingChannelRow } from "./tracking-analytics-types";

export const MAX_CHANNEL_BARS = 8;

const RANK_COLORS = [
  "hsl(var(--primary))",
  "hsl(262 42% 56%)",
  "hsl(270 32% 60%)",
  "hsl(255 26% 58%)",
  "hsl(268 22% 64%)",
  "hsl(250 16% 56%)",
  "hsl(255 14% 62%)",
];

function rankColor(channel: TrackingChannel, index: number, isChampion: boolean) {
  if (channel === "UNIDENTIFIED") return "hsl(var(--muted-foreground) / 0.45)";
  if (isChampion) return "hsl(var(--success))";
  return RANK_COLORS[Math.min(index, RANK_COLORS.length - 1)]!;
}

export type ChannelBarPoint = {
  channel: TrackingChannel;
  label: string;
  shortLabel: string;
  netRevenue: number;
  previousNetRevenue: number;
  delta: number;
  growthRate: number | null;
  revenueShare: number | null;
  color: string;
  isChampion: boolean;
  currentWidth: number;
  previousWidth: number;
};

export type ChannelInsight = {
  channel: TrackingChannel;
  label: string;
  netRevenue: number;
  share: number | null;
  delta: number;
  growthRate: number | null;
};

export type ChannelOriginView = {
  bars: ChannelBarPoint[];
  champion: ChannelInsight | null;
  fastestGrowth: ChannelInsight | null;
  top3Share: number | null;
};

export function channelDelta(current: number, previous: number) {
  return current - previous;
}

export function channelGrowthRate(current: number, previous: number): number | null {
  return previous > 0 ? safeRate(current - previous, previous) : null;
}

function emptyRow(channel: TrackingChannel): TrackingChannelRow {
  return {
    channel,
    netRevenue: 0,
    previousNetRevenue: 0,
    revenueShare: 0,
    orders: 0,
    buyers: 0,
    newCustomers: 0,
    averageTicket: null,
  };
}

function mergeRows(rows: TrackingChannelRow[], channel: TrackingChannel): TrackingChannelRow {
  return rows.reduce(
    (total, row) => ({
      channel,
      netRevenue: total.netRevenue + row.netRevenue,
      previousNetRevenue: total.previousNetRevenue + row.previousNetRevenue,
      revenueShare: (total.revenueShare ?? 0) + (row.revenueShare ?? 0),
      orders: total.orders + row.orders,
      buyers: total.buyers + row.buyers,
      newCustomers: total.newCustomers + row.newCustomers,
      averageTicket: null,
    }),
    emptyRow(channel),
  );
}

export function groupChannelBars(
  channels: TrackingChannelRow[],
  maxBars = MAX_CHANNEL_BARS,
): TrackingChannelRow[] {
  const active = channels
    .filter((row) => row.netRevenue > 0 || row.previousNetRevenue > 0)
    .sort((a, b) => b.netRevenue - a.netRevenue || b.previousNetRevenue - a.previousNetRevenue);
  const unidentified = active.find((row) => row.channel === "UNIDENTIFIED");
  const identified = active.filter((row) => row.channel !== "UNIDENTIFIED");
  const unidentifiedSlot = unidentified ? 1 : 0;
  const capacity = Math.max(1, maxBars - unidentifiedSlot);
  if (identified.length <= capacity) {
    return unidentified ? [...identified, unidentified] : identified;
  }
  const keepCount = Math.max(1, capacity - 1);
  const kept: TrackingChannelRow[] = [];
  const rest: TrackingChannelRow[] = [];
  for (const row of identified) {
    if (row.channel === "OTHER" || kept.length >= keepCount) rest.push(row);
    else kept.push(row);
  }
  const others = mergeRows(rest, "OTHER");
  const grouped = unidentified ? [...kept, others, unidentified] : [...kept, others];
  return grouped.sort(
    (a, b) => b.netRevenue - a.netRevenue || b.previousNetRevenue - a.previousNetRevenue,
  );
}

function toInsight(row: TrackingChannelRow): ChannelInsight {
  return {
    channel: row.channel,
    label: CHANNEL_LABELS[row.channel],
    netRevenue: row.netRevenue,
    share: row.revenueShare,
    delta: channelDelta(row.netRevenue, row.previousNetRevenue),
    growthRate: channelGrowthRate(row.netRevenue, row.previousNetRevenue),
  };
}

export function buildChannelOriginView(
  channels: TrackingChannelRow[],
  totalNetRevenue: number,
): ChannelOriginView {
  const ranked = [...channels].sort(
    (a, b) => b.netRevenue - a.netRevenue || b.previousNetRevenue - a.previousNetRevenue,
  );
  const barsSource = groupChannelBars(ranked);
  const championRow = ranked.find((row) => row.netRevenue > 0) ?? null;
  const minPreviousForRate = Math.max(totalNetRevenue * 0.02, 1);
  const growthCandidates = ranked.filter(
    (row) =>
      row.netRevenue > 0 &&
      row.previousNetRevenue >= minPreviousForRate &&
      (channelGrowthRate(row.netRevenue, row.previousNetRevenue) ?? 0) > 0,
  );
  const fastest =
    [...growthCandidates].sort((a, b) => {
      const growthA = channelGrowthRate(a.netRevenue, a.previousNetRevenue) ?? -Infinity;
      const growthB = channelGrowthRate(b.netRevenue, b.previousNetRevenue) ?? -Infinity;
      return (
        growthB - growthA ||
        channelDelta(b.netRevenue, b.previousNetRevenue) -
          channelDelta(a.netRevenue, a.previousNetRevenue)
      );
    })[0] ??
    [...ranked]
      .filter((row) => channelDelta(row.netRevenue, row.previousNetRevenue) > 0)
      .sort(
        (a, b) =>
          channelDelta(b.netRevenue, b.previousNetRevenue) -
          channelDelta(a.netRevenue, a.previousNetRevenue),
      )[0] ??
    null;
  const top3Share = safeRate(
    ranked.slice(0, 3).reduce((sum, row) => sum + row.netRevenue, 0),
    totalNetRevenue,
  );
  const scale = Math.max(
    ...barsSource.map((row) => Math.max(row.netRevenue, row.previousNetRevenue)),
    1,
  );
  return {
    bars: barsSource.map((row, index) => {
      const isChampion = championRow?.channel === row.channel && row.channel !== "UNIDENTIFIED";
      return {
        channel: row.channel,
        label: CHANNEL_LABELS[row.channel],
        shortLabel: CHANNEL_LABELS[row.channel],
        netRevenue: row.netRevenue,
        previousNetRevenue: row.previousNetRevenue,
        delta: channelDelta(row.netRevenue, row.previousNetRevenue),
        growthRate: channelGrowthRate(row.netRevenue, row.previousNetRevenue),
        revenueShare: row.revenueShare ?? safeRate(row.netRevenue, totalNetRevenue),
        color: rankColor(row.channel, index, isChampion),
        isChampion,
        currentWidth: (row.netRevenue / scale) * 100,
        previousWidth: (row.previousNetRevenue / scale) * 100,
      };
    }),
    champion: championRow ? toInsight(championRow) : null,
    fastestGrowth: fastest ? toInsight(fastest) : null,
    top3Share,
  };
}
