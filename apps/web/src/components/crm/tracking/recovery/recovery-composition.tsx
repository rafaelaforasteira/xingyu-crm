"use client";
import type { CSSProperties } from "react";
import type { RecoveryCompositionMethod, RecoveryOverviewData } from "@xingyu/types";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { AnimatedMetric, useTrackingMotion } from "../tracking-motion";
import { ChartTooltip, TrackingTooltipPortal } from "../tracking-help";
import overview from "../tracking-overview.module.css";
import {
  recoveryCompactMoney,
  recoveryMoney,
  recoveryPercent,
  recoveryHours,
} from "./recovery-format";
import styles from "./recovery.module.css";

const categories: Record<
  RecoveryCompositionMethod,
  { label: string; color: string; weight: string }
> = {
  AUTOMATIC: { label: "Automática", color: "var(--tracking-data-blue)", weight: "7%" },
  CONSULTANT: { label: "Consultora", color: "var(--tracking-data-pink)", weight: "7%" },
  UNKNOWN: { label: "Não identificada", color: "var(--tracking-data-charcoal)", weight: "6%" },
};
/** Same chart/card/row classes and exact Pie geometry as SalesOverview's approved composition. */
export function RecoveryComposition({ data }: { data: RecoveryOverviewData }) {
  const { revision, reduced, initial } = useTrackingMotion();
  const rows = data.compositionBreakdown;
  return (
    <section
      className={overview.chartCard + " " + styles.compositionWidget}
      aria-label="Composição da recuperação"
    >
      <h3 className="font-semibold">Composição da recuperação</h3>
      <p className="mt-1 text-xs text-muted-foreground">Automática versus consultora.</p>
      <div
        className={overview.compositionDonut}
        role="img"
        aria-label={`Composição de ${recoveryMoney(data.summary.recoveredCents)} recuperados. ${rows.map((m) => `${categories[m.method].label}: ${recoveryMoney(m.revenueCents)}`).join("; ")}`}
      >
        <div className={overview.compositionDonutChart}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                key={revision}
                data={rows.filter((m) => m.revenueCents > 0)}
                dataKey="revenueCents"
                nameKey="method"
                innerRadius={68}
                outerRadius={92}
                paddingAngle={2}
                cornerRadius={6}
                stroke="var(--tracking-surface)"
                strokeWidth={2}
                isAnimationActive={!reduced}
                animationDuration={initial ? 600 : 350}
              >
                {rows
                  .filter((m) => m.revenueCents > 0)
                  .map((m) => (
                    <Cell key={m.method} fill={categories[m.method].color} />
                  ))}
              </Pie>
              <Tooltip
                isAnimationActive={false}
                wrapperStyle={{ outline: "none", zIndex: 0, pointerEvents: "none" }}
                content={({ active, payload }) => {
                  const m = payload?.[0]?.payload as (typeof rows)[number] | undefined;
                  return active && m ? (
                    <TrackingTooltipPortal resetKey={m.method}>
                      <ChartTooltip
                        title={categories[m.method].label}
                        accent={categories[m.method].color}
                        rows={[
                          ["Receita recuperada", recoveryMoney(m.revenueCents)],
                          ["Participação", recoveryPercent(m.revenueShare)],
                          ["Pedidos", String(m.cases)],
                          ["Tempo médio", recoveryHours(m.meanHours)],
                        ]}
                      />
                    </TrackingTooltipPortal>
                  ) : null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className={overview.compositionDonutCenter}>
          <strong className="text-2xl font-semibold tracking-tight tabular-nums">
            <AnimatedMetric value={data.summary.recoveredCents} format={recoveryCompactMoney} />
          </strong>
          <span className="text-[11px] text-muted-foreground">Recuperados</span>
        </div>
      </div>
      <div className={overview.compositionList}>
        {rows.map((m) => (
          <div
            key={m.method}
            className={overview.compositionRow + " " + styles.recoveryCompositionRow}
            data-composition-method={m.method}
            style={
              {
                "--composition-color": categories[m.method].color,
                "--composition-weight": categories[m.method].weight,
              } as CSSProperties
            }
          >
            <div className={overview.compositionIdentity}>
              <div className={overview.compositionName}>
                <span
                  className={overview.compositionDot}
                  style={{ background: categories[m.method].color }}
                />
                <span>{categories[m.method].label}</span>
              </div>
              <span className={overview.compositionMoney}>
                {m.cases} pedidos · {recoveryHours(m.meanHours)}
              </span>
            </div>
            <div className={overview.compositionFigures}>
              <strong className={overview.compositionShare}>
                {recoveryPercent(m.revenueShare)}
              </strong>
              <span className={overview.compositionMoney}>{recoveryMoney(m.revenueCents)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
