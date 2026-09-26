import { safeRate } from "./financial-flow";
import { CHANNEL_COLORS, CHANNEL_LABELS } from "./channel-origin-config";
import type { TrackingChannel, TrackingChannelRow } from "./tracking-analytics-types";

export { CHANNEL_COLORS };

export const MAX_CHANNEL_BARS = 8;

export const COVERAGE_COLORS = {
  identified: "#2563eb",
  unidentified: "hsl(0 62% 46%)",
};

export type TreemapRect = ChannelTreemapCell & {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Binary treemap: area of each cell is proportional to channel net revenue. */
export function layoutTreemap(
  items: ChannelTreemapCell[],
  width: number,
  height: number,
  gap = 0,
): TreemapRect[] {
  const nodes = items.filter((item) => item.size > 0).sort((a, b) => b.size - a.size);
  const total = nodes.reduce((sum, item) => sum + item.size, 0);
  if (!total || width <= 0 || height <= 0) return [];

  const place = (
    item: ChannelTreemapCell,
    x: number,
    y: number,
    w: number,
    h: number,
  ): TreemapRect => ({
    ...item,
    x: x + gap / 2,
    y: y + gap / 2,
    width: Math.max(0, w - gap),
    height: Math.max(0, h - gap),
  });

  const split = (
    list: ChannelTreemapCell[],
    x: number,
    y: number,
    w: number,
    h: number,
  ): TreemapRect[] => {
    if (!list.length) return [];
    const first = list[0];
    if (list.length === 1 && first) return [place(first, x, y, w, h)];
    const sum = list.reduce((acc, item) => acc + item.size, 0);
    let acc = 0;
    let cut = 1;
    for (let index = 0; index < list.length - 1; index += 1) {
      acc += list[index]!.size;
      cut = index + 1;
      if (acc >= sum / 2) break;
    }
    const left = list.slice(0, cut);
    const right = list.slice(cut);
    const fraction = left.reduce((value, item) => value + item.size, 0) / sum;
    if (w >= h) {
      const splitWidth = w * fraction;
      return [...split(left, x, y, splitWidth, h), ...split(right, x + splitWidth, y, w - splitWidth, h)];
    }
    const splitHeight = h * fraction;
    return [...split(left, x, y, w, splitHeight), ...split(right, x, y + splitHeight, w, h - splitHeight)];
  };

  return split(nodes, 0, 0, width, height);
}

export type ChannelTreemapCell = {
  name: string;
  size: number;
  fill: string;
  share: number | null;
  channel: TrackingChannel;
};

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
  treemap: ChannelTreemapCell[];
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

function compareNetRevenueDesc(a: TrackingChannelRow, b: TrackingChannelRow) {
  return (
    b.netRevenue - a.netRevenue ||
    b.previousNetRevenue - a.previousNetRevenue ||
    a.channel.localeCompare(b.channel)
  );
}

export function groupChannelBars(
  channels: TrackingChannelRow[],
  maxBars = MAX_CHANNEL_BARS,
): TrackingChannelRow[] {
  const active = channels
    .filter((row) => row.netRevenue > 0 || row.previousNetRevenue > 0)
    .sort(compareNetRevenueDesc);
  const unidentified = active.find((row) => row.channel === "UNIDENTIFIED");
  const identified = active.filter((row) => row.channel !== "UNIDENTIFIED");
  const unidentifiedSlot = unidentified ? 1 : 0;
  const capacity = Math.max(1, maxBars - unidentifiedSlot);
  if (identified.length <= capacity) {
    const listed = unidentified ? [...identified, unidentified] : identified;
    return [...listed].sort(compareNetRevenueDesc);
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
  return [...grouped].sort(compareNetRevenueDesc);
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
  const ranked = [...channels].sort(compareNetRevenueDesc);
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
    bars: barsSource.map((row) => {
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
        color: CHANNEL_COLORS[row.channel],
        isChampion,
        currentWidth: Math.min(100, row.revenueShare ?? safeRate(row.netRevenue, totalNetRevenue) ?? 0),
        previousWidth: (row.previousNetRevenue / scale) * 100,
      };
    }),
    treemap: barsSource
      .filter((row) => row.netRevenue > 0)
      .map((row) => ({
        channel: row.channel,
        name: CHANNEL_LABELS[row.channel],
        size: row.netRevenue,
        fill: CHANNEL_COLORS[row.channel],
        share: row.revenueShare ?? safeRate(row.netRevenue, totalNetRevenue),
      })),
    champion: championRow ? toInsight(championRow) : null,
    fastestGrowth: fastest ? toInsight(fastest) : null,
    top3Share,
  };
}
