"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReducedMotion } from "@/components/crm/dashboard/analytics-charts";
import { FunnelTooltipScope, FunnelTooltipTrigger } from "./financial-funnel-tooltip";
import { ChartTooltip, ConceptHelp } from "./tracking-help";
import { METRIC_DEFINITIONS } from "./tracking-dictionary";
import { money, percentage } from "./tracking-format";
import { AnimatedMetric, useTrackingMotion } from "./tracking-motion";
import type { SalesTrackingData } from "./sales-tracking-types";
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
  const view = buildChannelOriginView(data.channels, attribution.totalNetRevenue);
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
    <Card className={"min-w-0 rounded-2xl shadow-soft " + styles.section}>
      <CardHeader className="space-y-1.5">
        <CardTitle>De onde vêm as vendas?</CardTitle>
        <p className="text-xs text-muted-foreground">
          Entenda quais canais estão associados à receita líquida realizada no período.
        </p>
      </CardHeader>
      <CardContent className={styles.layout}>
        <ChannelInsightScope className={styles.channels} revision={revision}>
          {view.bars.length ? (
            view.bars.map((row, index) => (
              <ChannelCard key={row.channel} row={row} index={index} />
            ))
          ) : (
            <p className={styles.empty}>Não há receita líquida para atribuir neste recorte.</p>
          )}
        </ChannelInsightScope>

        <section className={styles.coverage} aria-label="Cobertura de atribuição">
          <div className={styles.coverageHead}>
            <h4 className={styles.blockTitle}>Cobertura de atribuição</h4>
            <ConceptHelp label="Cobertura de atribuição" text={METRIC_DEFINITIONS.coverage} />
          </div>
          <div className={styles.donutStage}>
            <div className={styles.donutWrap}>
              {coverageSlices.length ? (
                <>
                  <div className={styles.donutChart}>
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        key={"coverage-" + revision}
                        data={coverageSlices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={coverageSlices.length > 1 ? 3 : 0}
                        cornerRadius={5}
                        stroke="none"
                        isAnimationActive={!reduced}
                        animationDuration={initial ? 700 : 380}
                      >
                        {coverageSlices.map((slice) => (
                          <Cell key={slice.name} fill={slice.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          const item = payload?.[0]?.payload as
                            | (typeof coverageSlices)[number]
                            | undefined;
                          return active && item ? (
                            <ChartTooltip
                              title={item.name}
                              rows={[
                                ["Receita líquida", money(item.value)],
                                ["Participação", percentage(item.share)],
                              ]}
                            />
                          ) : null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  </div>
                  <div className={styles.donutCenter}>
                    <p className={styles.coverageValue}>
                      <AnimatedMetric
                        value={attribution.attributedRevenueShare}
                        format={percentage}
                        duration={750}
                      />
                    </p>
                    <p className={styles.coverageHint}>identificada</p>
                  </div>
                </>
              ) : (
                <p className={styles.coverageHint}>Sem receita no recorte para medir cobertura.</p>
              )}
            </div>
          </div>
          <dl className={styles.split}>
            <div>
              <dt>
                <span className={styles.dot} style={{ background: COVERAGE_COLORS.identified }} />
                Identificada
              </dt>
              <dd data-tone="identified">
                <AnimatedMetric value={attribution.attributedRevenue} format={money} duration={500} />
              </dd>
              <dd className={styles.splitShare}>{percentage(attribution.attributedRevenueShare)}</dd>
            </div>
            <div>
              <dt>
                <span className={styles.dot} style={{ background: COVERAGE_COLORS.unidentified }} />
                Não identificada
              </dt>
              <dd>
                <AnimatedMetric
                  value={attribution.unattributedRevenue}
                  format={money}
                  duration={500}
                />
              </dd>
              <dd className={styles.splitShare}>
                {percentage(attribution.unattributedRevenueShare)}
              </dd>
            </div>
          </dl>
        </section>

        <aside className={styles.insights} aria-label="Insights estratégicos">
          <InsightCard title="Canal campeão">
            {view.champion ? (
              <ChampionBody item={view.champion} />
            ) : (
              <p className={styles.coverageHint}>Sem canal em destaque neste recorte.</p>
            )}
          </InsightCard>
          <InsightCard title="Maior crescimento">
            {view.fastestGrowth ? (
              <GrowthBody item={view.fastestGrowth} />
            ) : (
              <p className={styles.coverageHint}>Sem comparativo anterior para crescimento.</p>
            )}
          </InsightCard>
          <InsightCard title="Concentração" subtitle="Top canais por participação na receita">
            <ConcentrationTreemap items={view.treemap} revision={revision} />
            <p className={styles.concentrationSummary}>
              Top 3 canais representam{" "}
              <strong>
                <AnimatedMetric value={view.top3Share} format={percentage} duration={500} />
              </strong>{" "}
              da receita líquida
            </p>
          </InsightCard>
        </aside>
      </CardContent>
    </Card>
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

function ChampionBody({ item }: { item: ChannelInsight }) {
  return (
    <div className={styles.insightRow}>
      <span className={styles.insightMark} style={{ "--accent": itemColor(item) } as CSSProperties}>
        <ChannelBrandMark channel={item.channel} size={20} />
      </span>
      <div className={styles.insightCopy}>
        <p className={styles.insightTitle}>{item.label}</p>
        <p className={styles.insightValue}>
          <AnimatedMetric value={item.netRevenue} format={money} duration={500} />
        </p>
        <p className={styles.insightMeta}>{percentage(item.share)} da receita líquida</p>
      </div>
    </div>
  );
}

function GrowthBody({ item }: { item: ChannelInsight }) {
  return (
    <div className={styles.insightRow}>
      <span className={styles.insightMark} style={{ "--accent": itemColor(item) } as CSSProperties}>
        <ChannelBrandMark channel={item.channel} size={20} />
      </span>
      <div className={styles.insightCopy}>
        <p className={styles.insightTitle}>{item.label}</p>
        <p className={styles.growthValue}>{signedPercent(item.growthRate)}</p>
        <p className={styles.insightMeta}>{signedMoney(item.delta)}</p>
      </div>
    </div>
  );
}

function itemColor(item: ChannelInsight) {
  return CHANNEL_COLORS[item.channel];
}

function cellLabel(name: string, width: number, height: number) {
  if (width < 58 || height < 28) return "";
  const short = name.split(" / ")[0] ?? name;
  if (width >= 96 && height >= 36) return name;
  return short;
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
  const cells = layoutTreemap(items, box.width, box.height);
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
              width: cell.width,
              height: cell.height,
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
