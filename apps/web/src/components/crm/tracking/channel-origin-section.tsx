"use client";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReducedMotion } from "@/components/crm/dashboard/analytics-charts";
import { FunnelTooltipScope, FunnelTooltipTrigger } from "./financial-funnel-tooltip";
import { ChartTooltip, ConceptHelp } from "./tracking-help";
import { money, percentage } from "./tracking-format";
import { AnimatedMetric, useInViewOnce, useTrackingMotion } from "./tracking-motion";
import type { SalesTrackingData } from "./sales-tracking-types";
import { METRIC_DEFINITIONS } from "./tracking-dictionary";
import {
  CHANNEL_COLORS,
  COVERAGE_COLORS,
  buildChannelOriginView,
  layoutTreemap,
  type ChannelInsight,
  type ChannelTreemapCell,
} from "./channel-origin-model";
import { ChannelBrandMark } from "./channel-origin-brand";
import { ChannelCard, ChannelInsightScope, signedMoney, signedPercent } from "./channel-origin-popover";
import styles from "./channel-origin-section.module.css";

export function ChannelOriginSection({ data }: { data: SalesTrackingData }) {
  const { attribution } = data;
  const { revision, initial } = useTrackingMotion();
  const reduced = useReducedMotion();
  const reveal = useInViewOnce<HTMLDivElement>(0.25);
  const view = useMemo(
    () => buildChannelOriginView(data.channels, attribution.totalNetRevenue),
    [data.channels, attribution.totalNetRevenue],
  );
  const coverageSlices = [
    {
      name: "Identificada",
      value: attribution.attributedRevenue,
      share: attribution.attributedRevenueShare,
      color: COVERAGE_COLORS.identified,
    },
    {
      name: "Não identificada",
      value: attribution.unattributedRevenue,
      share: attribution.unattributedRevenueShare,
      color: COVERAGE_COLORS.unidentified,
    },
  ].filter((slice) => slice.value > 0);
  return (
    <Card
      ref={reveal.ref}
      data-revealed={reveal.seen ? "true" : "false"}
      className={
        "min-w-0 overflow-hidden rounded-2xl border-0 bg-[color-mix(in_srgb,hsl(var(--muted))_25%,hsl(var(--card)))] shadow-none " +
        styles.section
      }
    >
      <CardHeader className="space-y-0 px-3 pb-0 pt-3 sm:px-5 sm:pt-5">
        <CardTitle className="tracking-normal">De onde vêm as vendas?</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Entenda quais canais estão associados à receita líquida realizada no período.
        </p>
      </CardHeader>
      <CardContent className={styles.layout + " px-3 pb-3 pt-4 sm:px-5 sm:pb-5"}>
        <ChannelInsightScope
          className={styles.channels}
          revision={revision}
          order={view.bars.map((row) => row.channel).join("|")}
        >
          {view.bars.length ? (
            view.bars.map((row, index) => (
              <ChannelCard key={row.channel} row={row} index={index} animate={reveal.seen} />
            ))
          ) : (
            <p className={styles.empty}>Não há receita líquida para atribuir neste recorte.</p>
          )}
        </ChannelInsightScope>

        <CoverageBlock
          slices={coverageSlices}
          identifiedShare={attribution.attributedRevenueShare}
          identifiedRevenue={attribution.attributedRevenue}
          unidentifiedShare={attribution.unattributedRevenueShare}
          unidentifiedRevenue={attribution.unattributedRevenue}
          reduced={reduced}
          initial={initial}
          animate={reveal.seen}
        />

        <aside className={styles.insights} aria-label="Insights estratégicos">
          <InsightCard title="Canal campeão">
            {view.champion ? (
              <ChampionBody item={view.champion} animate={reveal.seen} />
            ) : (
              <p className={styles.coverageHint}>Sem canal em destaque neste recorte.</p>
            )}
          </InsightCard>
          <InsightCard title="Maior crescimento">
            {view.fastestGrowth ? (
              <GrowthBody item={view.fastestGrowth} animate={reveal.seen} />
            ) : (
              <p className={styles.coverageHint}>Sem comparativo anterior para crescimento.</p>
            )}
          </InsightCard>
          <InsightCard title="Concentração" subtitle="Top canais por participação na receita">
            <ConcentrationTreemap items={view.treemap} revision={revision} />
            <p className={styles.concentrationSummary}>
              Top 3 canais representam{" "}
              <strong>
                <AnimatedMetric
                  value={view.top3Share}
                  format={percentage}
                  duration={500}
                  active={reveal.seen}
                />
              </strong>{" "}
              da receita líquida
            </p>
          </InsightCard>
        </aside>
      </CardContent>
    </Card>
  );
}

type CoverageSlice = {
  name: string;
  value: number;
  share: number | null;
  color: string;
};

function CoverageBlock({
  slices,
  identifiedShare,
  identifiedRevenue,
  unidentifiedShare,
  unidentifiedRevenue,
  reduced,
  initial,
  animate,
}: {
  slices: CoverageSlice[];
  identifiedShare: number | null;
  identifiedRevenue: number | null;
  unidentifiedShare: number | null;
  unidentifiedRevenue: number | null;
  reduced: boolean;
  initial: boolean;
  animate: boolean;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const rows = [
    {
      name: "Identificada",
      share: identifiedShare,
      revenue: identifiedRevenue,
      color: COVERAGE_COLORS.identified,
    },
    {
      name: "Não identificada",
      share: unidentifiedShare,
      revenue: unidentifiedRevenue,
      color: COVERAGE_COLORS.unidentified,
    },
  ];
  return (
    <section className={styles.coverage} aria-label="Cobertura de atribuição">
      <div className={styles.coverageHead}>
        <h3 className={styles.coverageTitle}>Cobertura de atribuição</h3>
        <ConceptHelp label="Cobertura de atribuição" text={METRIC_DEFINITIONS.coverage} />
      </div>
      <div className={styles.donutStage}>
        <div ref={anchor} className={styles.donutWrap}>
          {slices.length ? (
            <>
              <div className={styles.donutChart}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      key={animate ? "coverage-draw" : "coverage-hold"}
                      data={slices}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="68%"
                      outerRadius="92%"
                      paddingAngle={slices.length > 1 ? 3 : 0}
                      cornerRadius={5}
                      stroke="none"
                      activeShape={(props: PieSectorDataItem) => (
                        <Sector
                          {...props}
                          outerRadius={(typeof props.outerRadius === "number" ? props.outerRadius : 0) + 4}
                        />
                      )}
                      isAnimationActive={animate && !reduced}
                      animationEasing="ease-out"
                      animationDuration={initial ? 650 : 500}
                    >
                      {slices.map((slice) => (
                        <Cell key={slice.name} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ display: "none" }}
                      content={({ active, payload }) => (
                        <CoverageSliceTooltip
                          active={active}
                          payload={payload as Array<{ payload?: CoverageSlice }> | undefined}
                          anchor={anchor.current}
                        />
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.donutCenter}>
                <strong className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                  <AnimatedMetric value={identifiedShare} format={percentage} duration={650} active={animate} />
                </strong>
                <span className="text-[11px] leading-none text-muted-foreground">identificada</span>
              </div>
            </>
          ) : (
            <p className={styles.coverageHint}>Sem receita no recorte para medir cobertura.</p>
          )}
        </div>
      </div>
      <div className={styles.coverageFoot}>
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between gap-3 rounded-xl bg-card/80 px-3 py-2.5 text-xs"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
              <span className="truncate text-foreground">{row.name}</span>
            </div>
            <div className="text-right">
              <strong className="block text-foreground tabular-nums">
                <AnimatedMetric value={row.share} format={percentage} duration={500} active={animate} />
              </strong>
              <span className="text-muted-foreground">
                <AnimatedMetric value={row.revenue} format={money} duration={500} active={animate} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CoverageSliceTooltip({
  active,
  payload,
  anchor,
}: {
  active?: boolean;
  payload?: Array<{ payload?: CoverageSlice }>;
  anchor: HTMLDivElement | null;
}) {
  const item = active ? payload?.[0]?.payload : undefined;
  const tip = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!item || !anchor) {
      setBox(null);
      return;
    }
    const place = () => {
      const node = tip.current;
      const rect = anchor.getBoundingClientRect();
      const width = node?.offsetWidth || 196;
      const height = node?.offsetHeight || 96;
      const gap = 12;
      const pad = 8;
      const sideTop = rect.top + (rect.height - height) / 2;
      const centeredLeft = rect.left + (rect.width - width) / 2;
      const candidates = [
        { left: centeredLeft, top: rect.top - height + 14 },
        { left: rect.right + gap, top: sideTop },
        { left: rect.left - width - gap, top: sideTop },
      ];
      const overlapsCenter = (point: { left: number; top: number }) => {
        const right = point.left + width;
        const bottom = point.top + height;
        const holeLeft = rect.left + rect.width * 0.28;
        const holeRight = rect.right - rect.width * 0.28;
        const holeTop = rect.top + rect.height * 0.4;
        const holeBottom = rect.top + rect.height * 0.62;
        return right > holeLeft && point.left < holeRight && bottom > holeTop && point.top < holeBottom;
      };
      const fits = (point: { left: number; top: number }) =>
        point.left >= pad &&
        point.top >= pad &&
        point.left + width <= window.innerWidth - pad &&
        point.top + height <= window.innerHeight - pad &&
        !overlapsCenter(point);
      const chosen = candidates.find(fits) ?? candidates[1]!;
      setBox({
        left: Math.max(pad, Math.min(chosen.left, window.innerWidth - width - pad)),
        top: Math.max(pad, Math.min(chosen.top, window.innerHeight - height - pad)),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, item]);
  if (!item || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={tip}
      className="pointer-events-none fixed z-40"
      style={{
        left: box?.left ?? -9999,
        top: box?.top ?? 0,
        visibility: box ? "visible" : "hidden",
      }}
    >
      <ChartTooltip
        accent={item.color}
        title={item.name}
        rows={[
          ["Receita líquida", money(item.value)],
          ["Participação", percentage(item.share)],
        ]}
      />
    </div>,
    document.body,
  );
}

function InsightCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.insightCard}>
      <p className={styles.insightLabel}>{title}</p>
      {subtitle ? <p className={styles.insightSubtitle}>{subtitle}</p> : null}
      {children}
    </div>
  );
}

function ChampionBody({ item, animate }: { item: ChannelInsight; animate: boolean }) {
  return (
    <div className={styles.insightRow}>
      <span className={styles.insightMark} style={{ "--accent": itemColor(item) } as CSSProperties}>
        <ChannelBrandMark channel={item.channel} size={22} />
      </span>
      <div className={styles.insightCopy}>
        <p className={styles.insightTitle}>{item.label}</p>
        <p className={styles.insightValue}>
          <AnimatedMetric value={item.netRevenue} format={money} duration={500} active={animate} />
        </p>
        <p className={styles.insightMeta}>
          <AnimatedMetric value={item.share} format={percentage} duration={420} active={animate} /> da receita líquida
        </p>
      </div>
    </div>
  );
}

function GrowthBody({ item, animate }: { item: ChannelInsight; animate: boolean }) {
  return (
    <div className={styles.insightRow}>
      <span className={styles.insightMark} style={{ "--accent": itemColor(item) } as CSSProperties}>
        <ChannelBrandMark channel={item.channel} size={22} />
      </span>
      <div className={styles.insightCopy}>
        <p className={styles.insightTitle}>{item.label}</p>
        <p className={styles.growthValue}>
          <AnimatedMetric value={item.growthRate} format={signedPercent} duration={420} active={animate} />
        </p>
        <p className={styles.insightMeta + " " + styles.growthDelta}>{signedMoney(item.delta)}</p>
      </div>
    </div>
  );
}

function itemColor(item: ChannelInsight) {
  return CHANNEL_COLORS[item.channel];
}

function cellLabel(name: string, width: number, height: number) {
  if (height < 28) return "";
  const short = name.split(" / ")[0] ?? name;
  const fits = (text: string) => text.length * 6.2 + 20 <= width;
  if (fits(name)) return name;
  if (short !== name && fits(short)) return short;
  return "";
}

function ConcentrationTreemap({
  items,
  revision,
}: {
  items: ChannelTreemapCell[];
  revision: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const node = frame.current;
    if (!node) return;
    const update = () => {
      const next = node.getBoundingClientRect();
      setBox({ width: next.width, height: next.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [revision, items.length]);
  if (!items.length) {
    return <p className={styles.coverageHint}>Sem canais para calcular concentração.</p>;
  }
  const cells = layoutTreemap(items, box.width, box.height, 0);
  return (
    <FunnelTooltipScope revision={revision} className={styles.treemap}>
      <div ref={frame} className={styles.treemapCanvas} aria-hidden={cells.length === 0}>
        {cells.map((cell) => (
          <FunnelTooltipTrigger
            key={cell.channel}
            label={cell.name}
            className={styles.treemapCell}
            style={{
              left: cell.x,
              top: cell.y,
              width: cell.width + 1,
              height: cell.height + 1,
              background: cell.fill,
              color:
                cell.channel === "GOOGLE_ADS"
                  ? "hsl(var(--warning-foreground))"
                  : "hsl(var(--primary-foreground))",
            }}
            text={
              <>
                <strong className="mb-2 block font-semibold text-primary">{cell.name}</strong>
                <span className="flex justify-between gap-5 py-0.5">
                  <span className="text-muted-foreground">Receita líquida</span>
                  <strong className="tabular-nums">{money(cell.size)}</strong>
                </span>
                <span className="flex justify-between gap-5 py-0.5">
                  <span className="text-muted-foreground">Participação</span>
                  <strong className="tabular-nums">{percentage(cell.share)}</strong>
                </span>
              </>
            }
          >
            {cellLabel(cell.name, cell.width, cell.height) ? (
              <span className={styles.treemapLabel}>
                {cellLabel(cell.name, cell.width, cell.height)}
              </span>
            ) : null}
          </FunnelTooltipTrigger>
        ))}
      </div>
    </FunnelTooltipScope>
  );
}
