"use client";
import styles from "./tracking-overview.module.css";
import { type ReactNode } from "react";
import { AnimatedMetric, useTrackingMotion } from "./tracking-motion";
import { ChartTooltip, TrackingTooltipPortal } from "./tracking-help";
import { compactMoney, integer, dateBR } from "./tracking-format";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/components/crm/dashboard/analytics-charts";
import type { SalesTrackingData, Trend } from "./sales-tracking-types";
import { SalesIntelligence } from "./sales-intelligence";
import { FinancialFunnel } from "./financial-funnel";
import {
  money,
  percentage as percent,
} from "./sales-overview-format";
export function SalesHero({ data }: { data: SalesTrackingData }) {
  const reduced = useReducedMotion();
  const { revision, initial } = useTrackingMotion();
  const overview = data.overview;
  const composition = [
    {
      name: "Primeira compra",
      tone: "first",
      value: overview.firstPurchaseRevenue,
      percentage: overview.firstPurchaseRevenuePercentage,
      color: "var(--tracking-data-blue)",
      trend: overview.trends.firstPurchaseRevenue,
    },
    {
      name: "Recompra",
      tone: "repeat",
      value: overview.repeatRevenue,
      percentage: overview.repeatRevenuePercentage,
      color: "var(--tracking-data-yellow)",
      trend: overview.trends.repeatRevenue,
    },
  ];
  return (
    <div className="grid gap-5">
      <div className="grid w-full max-w-none items-stretch gap-3 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1fr)]">
        <section className={styles.funnelCard} aria-label="Fluxo financeiro">
          <FinancialFunnel flow={overview.financialFlow} />
        </section>
        <SalesIntelligence data={data} />
      </div>

      <div className={styles.heroCharts + " grid items-stretch gap-3 xl:grid-cols-[1.7fr_0.8fr]"}>
          <section
            className={styles.chartCard + " " + styles.evolution}
            aria-label="Evolução das vendas"
          >
            <div>
              <h3 className="font-semibold">Evolução das vendas</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Vendas brutas e líquidas ·{" "}
                {data.granularity === "day"
                  ? "visão diária"
                  : data.granularity === "week"
                    ? "visão semanal"
                    : "visão mensal"}
                .
              </p>
            </div>
            <div
              className={styles.chartPlot}
              aria-label="Gráfico temporal de vendas brutas e líquidas"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  accessibilityLayer
                  data={overview.timeline}
                  margin={{ top: 20, right: 18, left: 0, bottom: 16 }}
                >
                  <defs>
                    <linearGradient id="netSalesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--series-net)" stopOpacity={0.16} />
                      <stop offset="72%" stopColor="var(--series-net)" stopOpacity={0.04} />
                      <stop offset="100%" stopColor="var(--series-net)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--series-grid)" strokeDasharray="2 7" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date: string) =>
                      format(parseISO(date), data.granularity === "month" ? "MMM yy" : "dd MMM", {
                        locale: ptBR,
                      }).replace(".", "")
                    }
                    tickMargin={12}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={compactMoney}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={78}
                    tickMargin={8}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<SalesTimelineTooltip />}
                    isAnimationActive={false}
                    cursor={{ stroke: "var(--series-gross)", strokeOpacity: 0.45 }}
                    wrapperStyle={{ outline: "none", zIndex: 0, pointerEvents: "none" }}
                  />
                  <Area
                    key={"gross-" + revision}
                    type="monotone"
                    dataKey="grossSales"
                    name="Vendas brutas"
                    stroke="var(--series-gross)"
                    strokeWidth={1.75}
                    fill="transparent"
                    dot={false}
                    activeDot={{ r: 3.5, fill: "var(--series-gross)", stroke: "var(--tracking-surface)", strokeWidth: 2 }}
                    isAnimationActive={!reduced}
                    animationDuration={initial ? 600 : 350}
                  />
                  <Area
                    key={"net-" + revision}
                    type="monotone"
                    dataKey="netSales"
                    name="Vendas líquidas"
                    stroke="var(--series-net)"
                    strokeWidth={2.5}
                    fill="url(#netSalesGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      stroke: "var(--series-net)",
                      strokeWidth: 2,
                      fill: "var(--tracking-surface)",
                    }}
                    isAnimationActive={!reduced}
                    animationDuration={350}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className={styles.chartFade} aria-hidden="true" />
            </div>
            <div className={styles.chartLegend}>
              <LegendDot swatch="var(--series-gross)" label="Brutas" />
              <LegendDot swatch="var(--series-net)" label="Líquidas" />
            </div>
          </section>

          <section className={styles.chartCard} aria-label="Composição da receita líquida">
            <h3 className="font-semibold">Composição da receita líquida</h3>
            <p className="mt-1 text-xs text-muted-foreground">Primeira compra versus recompra.</p>
            <div className={styles.compositionDonut}>
              <div className={styles.compositionDonutChart}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    key={revision}
                    data={composition}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={92}
                    paddingAngle={2}
                    cornerRadius={6}
                    stroke="var(--tracking-surface)"
                    strokeWidth={2}
                    isAnimationActive={!reduced}
                    animationDuration={initial ? 600 : 350}
                  >
                    {composition.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    isAnimationActive={false}
                    wrapperStyle={{ outline: "none", zIndex: 0, pointerEvents: "none" }}
                    content={({ active, payload }) => {
                      const item = payload?.[0]?.payload as
                        (typeof composition)[number] | undefined;
                      return active && item ? (
                        <TrackingTooltipPortal resetKey={item.name}>
                          <ChartTooltip
                            accent={item.color}
                            title={item.name}
                            rows={[
                              ["Receita líquida", money(item.value)],
                              ["Participação", percent(item.percentage)],
                            ]}
                          />
                        </TrackingTooltipPortal>
                      ) : null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              </div>
              <div className={styles.compositionDonutCenter}>
                <strong className="text-2xl font-semibold tracking-tight tabular-nums">
                  <AnimatedMetric
                    value={overview.netSales}
                    format={(v) => (v == null ? "—" : compactMoney(v))}
                  />
                </strong>
                <span className="text-[11px] text-muted-foreground">Receita líquida</span>
              </div>
            </div>
            <div className={styles.compositionList}>
              {composition.map((item) => (
                <div key={item.name} className={styles.compositionRow} data-tone={item.tone}>
                  <div className={styles.compositionIdentity}>
                    <div className={styles.compositionName}>
                      <span className={styles.compositionDot} style={{ background: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <CompositionTrend trend={item.trend} />
                  </div>
                  <div className={styles.compositionFigures}>
                    <strong className={styles.compositionShare}>{percent(item.percentage)}</strong>
                    <span className={styles.compositionMoney}>{money(item.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
      </div>
    </div>
  );
}

function CompositionTrend({ trend }: { trend: Trend | null }) {
  if (!trend) {
    return (
      <div className={styles.compositionTrend}>
        <span className={styles.compositionChip} data-sentiment="unavailable" aria-label="Comparação com o período anterior indisponível">
          —
        </span>
        <span className={styles.compositionCaption}>vs. período anterior</span>
      </div>
    );
  }
  const Icon = trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;
  const amount = `${trend.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  const meaning =
    trend.direction === "up" ? "Aumento" : trend.direction === "down" ? "Redução" : "Sem variação";
  return (
    <div className={styles.compositionTrend}>
      <span
        className={styles.compositionChip}
        data-sentiment={trend.sentiment}
        aria-label={`${meaning} de ${amount} em relação ao período anterior`}
      >
        <Icon size={11} aria-hidden="true" />
        {amount}
      </span>
      <span className={styles.compositionCaption}>vs. período anterior</span>
    </div>
  );
}

function LegendDot({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full")} style={{ background: swatch }} />
      {label}
    </span>
  );
}

function SalesTimelineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      date: string;
      endDate: string;
      grossSales: number;
      netSales: number;
      paidOrders: number;
      realizationRate: number | null;
    };
  }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const realization = point.realizationRate;
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${point.date}T12:00:00`))
    .replace(".", "");
  return (
    <TrackingTooltipPortal resetKey={point.date + point.endDate}>
      <div
        data-module-theme="tracking"
        className={styles.chartTip + " tracking-portal min-w-48 rounded-xl p-3 text-xs shadow-soft"}
      >
      <p className="mb-2 font-semibold">
        {point.endDate !== point.date ? dateBR(point.date) + " → " + dateBR(point.endDate) : date}
      </p>
      <TooltipRow label="Vendas brutas" value={money(point.grossSales)} swatch="var(--tip-gross)" />
      <TooltipRow label="Vendas líquidas" value={money(point.netSales)} swatch="var(--tracking-accent)" />
      <div className="mt-2 border-t border-border/60 pt-2">
        <TooltipRow
          label="Taxa de realização"
          value={realization == null ? "—" : percent(realization)}
        />
        <TooltipRow label="Pedidos pagos" value={integer(point.paidOrders)} />
      </div>
      </div>
    </TrackingTooltipPortal>
  );
}

function TooltipRow({
  label,
  value,
  swatch,
}: {
  label: string;
  value: ReactNode;
  swatch?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {swatch ? <span className="h-2 w-2 rounded-full" style={{ background: swatch }} /> : null}
        {label}
      </span>
      <strong className="tabular-nums">{value}</strong>
    </div>
  );
}
