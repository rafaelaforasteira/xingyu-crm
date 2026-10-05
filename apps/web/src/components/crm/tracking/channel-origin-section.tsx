"use client";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReducedMotion } from "@/components/crm/dashboard/analytics-charts";
import { ChartTooltip, ConceptHelp } from "./tracking-help";
import { money, percentage } from "./tracking-format";
import { AnimatedMetric, useInViewOnce, useTrackingMotion } from "./tracking-motion";
import type { SalesTrackingData } from "./sales-tracking-types";
import { METRIC_DEFINITIONS } from "./tracking-dictionary";
import {
  CHANNEL_COLORS,
  COVERAGE_COLORS,
  buildChannelOriginView,
  type ChannelInsight,
} from "./channel-origin-model";
import { journeyAnalyticsModel } from "./journey-analytics";
import { PurchaseJourneyCard } from "./purchase-journey-card";
import { ChannelBrandMark } from "./channel-origin-brand";
import {
  ChannelCard,
  ChannelInsightScope,
  deltaSentiment,
  signedMoney,
  signedPercent,
} from "./channel-origin-popover";
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

        <aside className={styles.insights} aria-label="Leituras dos canais">
          {view.champion ? (
            <QuickInsightCard
              label="Canal campeão"
              help={METRIC_DEFINITIONS.championChannel}
              channel={view.champion.channel}
              name={view.champion.label}
              money={
                <AnimatedMetric
                  value={view.champion.netRevenue}
                  format={compactInsightMoney}
                  duration={500}
                  active={reveal.seen}
                />
              }
              moneyLabel="Receita gerada"
              percent={
                <AnimatedMetric
                  value={view.champion.share}
                  format={percentage}
                  duration={420}
                  active={reveal.seen}
                />
              }
              percentLabel="da receita líquida"
              moneyTipTitle="Receita gerada"
              moneyTipRows={[
                ["Valor completo", money(view.champion.netRevenue)],
                ["Canal", view.champion.label],
              ]}
              percentTipTitle="Canal campeão"
              percentTipRows={[
                ["Canal", view.champion.label],
                ["Receita gerada", money(view.champion.netRevenue)],
                ["Participação", percentage(view.champion.share) + " da receita líquida"],
              ]}
            />
          ) : (
            <InsightCard title="Canal campeão" help={METRIC_DEFINITIONS.championChannel}>
              <p className={styles.coverageHint}>Sem canal em destaque neste recorte.</p>
            </InsightCard>
          )}
          {view.fastestGrowth ? (
            <QuickInsightCard
              label="Maior crescimento"
              help={METRIC_DEFINITIONS.fastestGrowth}
              channel={view.fastestGrowth.channel}
              name={view.fastestGrowth.label}
              money={
                <AnimatedMetric
                  value={view.fastestGrowth.delta}
                  format={compactSignedMoney}
                  duration={500}
                  active={reveal.seen}
                />
              }
              moneyLabel="Variação no período"
              moneyTone={deltaSentiment(view.fastestGrowth.delta)}
              percent={
                <AnimatedMetric
                  value={view.fastestGrowth.growthRate}
                  format={signedPercent}
                  duration={420}
                  active={reveal.seen}
                />
              }
              percentLabel="Crescimento no período"
              percentTone={deltaSentiment(view.fastestGrowth.growthRate)}
              moneyTipTitle="Variação no período"
              moneyTipRows={[
                ["Valor completo", signedMoney(view.fastestGrowth.delta)],
                ["Canal", view.fastestGrowth.label],
              ]}
              percentTipTitle="Maior crescimento"
              percentTipRows={[
                ["Canal", view.fastestGrowth.label],
                ["Variação no período", signedMoney(view.fastestGrowth.delta)],
                ["Crescimento", signedPercent(view.fastestGrowth.growthRate)],
              ]}
            />
          ) : (
            <InsightCard title="Maior crescimento" help={METRIC_DEFINITIONS.fastestGrowth}>
              <p className={styles.coverageHint}>Sem comparativo anterior para crescimento.</p>
            </InsightCard>
          )}
          <PurchaseJourneyCard journey={journeyAnalyticsModel(data)} animate={reveal.seen} />
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
  help,
  subtitle,
  children,
}: {
  title: string;
  help: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.insightCard}>
      <InsightHeading title={title} help={help} />
      {subtitle ? <p className={styles.insightSubtitle}>{subtitle}</p> : null}
      {children}
    </div>
  );
}

function InsightHeading({ title, help }: { title: string; help: string }) {
  return (
    <div className={styles.coverageHead}>
      <h3 className={styles.coverageTitle}>{title}</h3>
      <ConceptHelp label={title} text={help} />
    </div>
  );
}

type InsightTone = "neutral" | "positive" | "negative";

let closeActiveInsightTip: (() => void) | null = null;

function compactInsightMoney(value: number | null) {
  return formatCompactMoney(value, false);
}

function compactSignedMoney(value: number | null) {
  return formatCompactMoney(value, true);
}

function formatCompactMoney(value: number | null, signed: boolean) {
  if (value == null || !Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  const compact = absolute >= 1000;
  const text = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? (absolute >= 1_000_000 ? 1 : 0) : 2,
    minimumFractionDigits: compact ? 0 : 2,
  }).format(absolute);
  if (!signed || value === 0) return text;
  return (value > 0 ? "+" : "-") + text;
}

function toneClass(tone: InsightTone) {
  if (tone === "positive") return styles.quickPositive;
  if (tone === "negative") return styles.quickNegative;
  return "";
}

function QuickInsightCard({
  label,
  help,
  channel,
  name,
  money: moneyValue,
  moneyLabel,
  percent,
  percentLabel,
  moneyTone = "neutral",
  percentTone = "neutral",
  moneyTipTitle,
  moneyTipRows,
  percentTipTitle,
  percentTipRows,
}: {
  label: string;
  help: string;
  channel: ChannelInsight["channel"];
  name: string;
  money: ReactNode;
  moneyLabel: string;
  percent: ReactNode;
  percentLabel: string;
  moneyTone?: InsightTone;
  percentTone?: InsightTone;
  moneyTipTitle: string;
  moneyTipRows: Array<[string, string]>;
  percentTipTitle: string;
  percentTipRows: Array<[string, string]>;
}) {
  const accent = CHANNEL_COLORS[channel];
  const artwork =
    label === "Canal campeão" ? "trophy" : label === "Maior crescimento" ? "growth-v2" : "decline-v2";

  return (
    <div className={styles.insightCard + " " + styles.quickInsight} data-insight={label === "Canal campeão" ? "champion" : label === "Maior crescimento" ? "growth" : "lowest"}>
      <img
        src={"/tracking/channel-insights/" + artwork + ".png"}
        className={styles.insightArtwork}
        alt=""
        aria-hidden="true"
        width={64}
        height={64}
      />
      <InsightHeading title={label} help={help} />
      <div className={styles.quickGrid}>
        <div className={styles.quickIdentity}>
          <span className={styles.quickMark} style={{ "--accent": accent } as CSSProperties}>
            <ChannelBrandMark channel={channel} size={18} />
          </span>
          <p className={styles.quickName} title={name}>
            {name}
          </p>
        </div>
        <AbbreviatedValue
          placement={styles.quickMoney ?? ""}
          title={moneyTipTitle}
          rows={moneyTipRows}
          accent={accent}
          tone={moneyTone}
          description={moneyTipRows.map(([rowLabel, rowValue]) => rowLabel + ": " + rowValue).join(". ")}
        >
          {moneyValue}
        </AbbreviatedValue>
        <AbbreviatedValue
          placement={styles.quickPercent ?? ""}
          title={percentTipTitle}
          rows={percentTipRows}
          accent={accent}
          tone={percentTone}
          description={percentTipRows.map(([rowLabel, rowValue]) => rowLabel + ": " + rowValue).join(". ")}
        >
          {percent}
        </AbbreviatedValue>
        <p className={styles.quickCaption + " " + styles.quickMoneyCaption}>{moneyLabel}</p>
        <p className={styles.quickCaption + " " + styles.quickPercentCaption}>{percentLabel}</p>
      </div>
    </div>
  );
}

function AbbreviatedValue({
  placement,
  title,
  rows,
  accent,
  tone,
  description,
  children,
}: {
  placement: string;
  title: string;
  rows: Array<[string, string]>;
  accent: string;
  tone: InsightTone;
  description: string;
  children: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = tip.current?.offsetWidth || 220;
      const height = tip.current?.offsetHeight || 118;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const above = rect.top - height - 8;
      setBox({ left, top: above >= 8 ? above : rect.bottom + 8 });
    };
    place();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={placement + " " + (styles.quickFigure ?? "") + " " + toneClass(tone)}
        aria-label={description}
        onMouseEnter={() => {
          closeActiveInsightTip?.();
          closeActiveInsightTip = () => setOpen(false);
          setOpen(true);
        }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          closeActiveInsightTip?.();
          closeActiveInsightTip = () => setOpen(false);
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
      >
        {children}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tip}
              className="pointer-events-none fixed z-40"
              style={{
                left: box?.left ?? -9999,
                top: box?.top ?? 0,
                visibility: box ? "visible" : "hidden",
              }}
            >
              <ChartTooltip accent={accent} title={title} rows={rows} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

