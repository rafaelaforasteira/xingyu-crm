"use client";
import type { CSSProperties } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelTooltipScope, FunnelTooltipTrigger } from "./financial-funnel-tooltip";
import { ConceptHelp } from "./tracking-help";
import { METRIC_DEFINITIONS } from "./tracking-dictionary";
import { money, percentage } from "./tracking-format";
import { AnimatedMetric, AnimatedProgress, useTrackingMotion } from "./tracking-motion";
import type { SalesTrackingData } from "./sales-tracking-types";
import { buildChannelOriginView, type ChannelBarPoint } from "./channel-origin-model";
import styles from "./channel-origin-section.module.css";

function signedMoney(value: number) {
  if (value > 0) return "+" + money(value);
  if (value < 0) return money(value);
  return money(0);
}

function signedPercent(value: number | null) {
  if (value == null) return "—";
  if (value > 0) return "+" + percentage(value);
  if (value < 0) return "-" + percentage(Math.abs(value));
  return percentage(0);
}

function deltaSentiment(value: number | null) {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export function ChannelOriginSection({ data }: { data: SalesTrackingData }) {
  const { attribution } = data;
  const { revision } = useTrackingMotion();
  const view = buildChannelOriginView(data.channels, attribution.totalNetRevenue);
  return (
    <Card className={"min-w-0 rounded-2xl shadow-soft " + styles.section}>
      <CardHeader className="space-y-1.5">
        <CardTitle>De onde vêm as vendas?</CardTitle>
        <p className="text-xs text-muted-foreground">
          Entenda quais canais estão associados à receita líquida realizada no período.
        </p>
      </CardHeader>
      <CardContent className={styles.layout}>
        <FunnelTooltipScope
          className={styles.ranking}
          revision={revision}
        >
          {view.bars.length ? (
            view.bars.map((row, index) => (
              <ChannelRankRow key={row.channel} row={row} index={index} />
            ))
          ) : (
            <p className="rounded-xl bg-muted/40 p-6 text-sm text-muted-foreground">
              Não há receita líquida para atribuir neste recorte.
            </p>
          )}
        </FunnelTooltipScope>
        <aside className={styles.aside}>
          <div>
            <div className="flex items-center gap-1 text-sm font-medium">
              Cobertura de atribuição
              <ConceptHelp label="Cobertura de atribuição" text={METRIC_DEFINITIONS.coverage} />
            </div>
            <p className={styles.coverageValue}>
              <AnimatedMetric
                value={attribution.attributedRevenueShare}
                format={percentage}
                duration={750}
              />
            </p>
            <p className={styles.coverageHint}>da receita líquida possui origem identificada</p>
            <div className={styles.coverageTrack}>
              <AnimatedProgress
                value={attribution.attributedRevenueShare}
                className={styles.identified}
              />
            </div>
          </div>
          <dl className={styles.split}>
            <div>
              <dt>Identificada</dt>
              <dd data-tone="identified">
                <AnimatedMetric value={attribution.attributedRevenue} format={money} duration={500} />
              </dd>
              <dd className={styles.splitShare}>{percentage(attribution.attributedRevenueShare)}</dd>
            </div>
            <div>
              <dt>Não identificada</dt>
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
          <div className={styles.facts}>
            <div>
              <p className={styles.factLabel}>Canal campeão</p>
              {view.champion ? (
                <>
                  <p className={styles.factTitle}>{view.champion.label}</p>
                  <p className={styles.factMeta}>
                    <span className={styles.emphasis}>{money(view.champion.netRevenue)}</span>
                    <span>{percentage(view.champion.share)} da receita líquida</span>
                  </p>
                </>
              ) : (
                <p className={styles.coverageHint}>Sem canal em destaque neste recorte.</p>
              )}
            </div>
            <div>
              <p className={styles.factLabel}>Maior crescimento</p>
              {view.fastestGrowth ? (
                <>
                  <p className={styles.factTitle}>{view.fastestGrowth.label}</p>
                  <p className={styles.factMeta}>
                    <span className={styles.growth}>
                      {signedPercent(view.fastestGrowth.growthRate)}
                    </span>
                    <span>{signedMoney(view.fastestGrowth.delta)}</span>
                  </p>
                </>
              ) : (
                <p className={styles.coverageHint}>Sem comparativo anterior para crescimento.</p>
              )}
            </div>
            <div>
              <p className={styles.factLabel}>Concentração</p>
              <p className={styles.factTitle}>
                Top 3 representam{" "}
                <span className={styles.emphasis}>
                  <AnimatedMetric value={view.top3Share} format={percentage} duration={500} />
                </span>
              </p>
              <p className={styles.factMeta}>da receita líquida do período</p>
            </div>
          </div>
        </aside>
      </CardContent>
    </Card>
  );
}

function ChannelRankRow({ row, index }: { row: ChannelBarPoint; index: number }) {
  const TrendIcon =
    row.growthRate == null || row.growthRate === 0
      ? Minus
      : row.growthRate > 0
        ? ArrowUp
        : ArrowDown;
  return (
    <FunnelTooltipTrigger
      label={row.label}
      className={styles.row}
      style={{ "--delay": `${index * 40}ms` } as CSSProperties}
      text={
        <>
          <strong className="mb-2 block font-semibold text-primary">{row.label}</strong>
          <span className="flex justify-between gap-5 py-0.5">
            <span className="text-muted-foreground">Receita atual</span>
            <strong className="tabular-nums">{money(row.netRevenue)}</strong>
          </span>
          <span className="flex justify-between gap-5 py-0.5">
            <span className="text-muted-foreground">Receita anterior</span>
            <strong className="tabular-nums">{money(row.previousNetRevenue)}</strong>
          </span>
          <span className="flex justify-between gap-5 py-0.5">
            <span className="text-muted-foreground">Variação</span>
            <strong className="tabular-nums">{signedMoney(row.delta)}</strong>
          </span>
          <span className="flex justify-between gap-5 py-0.5">
            <span className="text-muted-foreground">Crescimento</span>
            <strong className="tabular-nums">{signedPercent(row.growthRate)}</strong>
          </span>
          <span className="flex justify-between gap-5 py-0.5">
            <span className="text-muted-foreground">Participação na receita líquida</span>
            <strong className="tabular-nums">{percentage(row.revenueShare)}</strong>
          </span>
        </>
      }
    >
      <span className={styles.heading}>
        <span className={styles.name}>{row.label}</span>
        <span className={styles.metrics}>
          <span className={styles.amount}>{money(row.netRevenue)}</span>
          <span>{percentage(row.revenueShare)}</span>
          <span className={styles.delta} data-sentiment={deltaSentiment(row.growthRate)}>
            <TrendIcon size={11} aria-hidden="true" />
            {signedPercent(row.growthRate)}
          </span>
        </span>
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.previous} style={{ width: row.previousWidth + "%" }} />
        <span
          className={styles.current}
          style={{ width: row.currentWidth + "%", background: row.color }}
        />
      </span>
    </FunnelTooltipTrigger>
  );
}
