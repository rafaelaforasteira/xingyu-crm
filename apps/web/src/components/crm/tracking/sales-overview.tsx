"use client";
import styles from "./tracking-overview.module.css";
import type { ReactNode } from "react";
import { AnimatedMetric, useTrackingMotion } from "./tracking-motion";
import { ChartTooltip } from "./tracking-help";
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
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/components/crm/dashboard/analytics-charts";
import type { SalesTrackingData } from "./sales-tracking-types";
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
      value: overview.firstPurchaseRevenue,
      percentage: overview.firstPurchaseRevenuePercentage,
      color: "hsl(var(--primary))",
    },
    {
      name: "Recompra",
      value: overview.repeatRevenue,
      percentage: overview.repeatRevenuePercentage,
      color: "hsl(var(--success))",
    },
  ];
  return (
    <Card className="overflow-hidden rounded-2xl border-primary/15 shadow-soft">
      <CardContent className="space-y-5 p-3 sm:p-5">
        <div className="mx-auto grid w-full gap-4 xl:w-[90%] xl:grid-cols-[0.92fr_0.9fr]">
          <section
            className="flex min-w-0 items-center rounded-2xl bg-muted/40 p-4"
            aria-label="Fluxo financeiro"
          >
            <FinancialFunnel flow={overview.financialFlow} />
          </section>

          <SalesIntelligence data={data} />
        </div>

        <div className={styles.heroCharts + " grid gap-5 xl:grid-cols-[1.7fr_0.8fr]"}>
          <section
            className="min-w-0 rounded-2xl bg-muted/25 p-3 sm:p-5"
            aria-label="Evolução das vendas"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
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
              <div className="flex gap-4 text-xs text-muted-foreground">
                <LegendDot color="bg-warning" label="Brutas" />
                <LegendDot color="bg-success" label="Líquidas" />
              </div>
            </div>
            <div
              className="mt-4 h-[310px]"
              aria-label="Gráfico temporal de vendas brutas e líquidas"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  accessibilityLayer
                  data={overview.timeline}
                  margin={{ top: 20, right: 18, left: 0, bottom: 16 }}
                >
                  <defs>
                    <linearGradient id="grossSalesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--warning))" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="netSalesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 4" opacity={0.16} />
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
                    cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.2 }}
                  />
                  <Area
                    key={"gross-" + revision}
                    type="monotone"
                    dataKey="grossSales"
                    name="Vendas brutas"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                    fill="url(#grossSalesGradient)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={!reduced}
                    animationDuration={initial ? 600 : 350}
                  />
                  <Area
                    key={"net-" + revision}
                    type="monotone"
                    dataKey="netSales"
                    name="Vendas líquidas"
                    stroke="hsl(var(--success))"
                    strokeWidth={2.5}
                    fill="url(#netSalesGradient)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={!reduced}
                    animationDuration={350}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section
            className="min-w-0 rounded-2xl bg-primary/[0.025] p-4 sm:p-5"
            aria-label="Composição da receita líquida"
          >
            <h3 className="font-semibold">Composição da receita líquida</h3>
            <p className="mt-1 text-xs text-muted-foreground">Primeira compra versus recompra.</p>
            <div className="relative mx-auto mt-3 h-[220px] max-w-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    key={revision}
                    data={composition}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={92}
                    paddingAngle={3}
                    cornerRadius={5}
                    stroke="none"
                    isAnimationActive={!reduced}
                    animationDuration={initial ? 600 : 350}
                  >
                    {composition.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      const item = payload?.[0]?.payload as
                        (typeof composition)[number] | undefined;
                      return active && item ? (
                        <ChartTooltip
                          title={item.name}
                          rows={[
                            ["Receita líquida", money(item.value)],
                            ["Participação", percent(item.percentage)],
                          ]}
                        />
                      ) : null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <strong className="text-2xl font-semibold tracking-tight tabular-nums">
                  <AnimatedMetric
                    value={overview.netSales}
                    format={(v) => (v == null ? "—" : compactMoney(v))}
                  />
                </strong>
                <span className="text-[11px] text-muted-foreground">Receita líquida</span>
              </div>
            </div>
            <div className="space-y-3">
              {composition.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-xl bg-card/80 px-3 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    <span>{item.name}</span>
                  </div>
                  <div className="text-right">
                    <strong className="block tabular-nums">{percent(item.percentage)}</strong>
                    <span className="text-muted-foreground">{money(item.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} />
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
    <div className="min-w-48 rounded-xl border border-border bg-card p-3 text-xs shadow-soft">
      <p className="mb-2 font-semibold">
        {point.endDate !== point.date ? dateBR(point.date) + " → " + dateBR(point.endDate) : date}
      </p>
      <TooltipRow label="Vendas brutas" value={money(point.grossSales)} color="bg-warning" />
      <TooltipRow label="Vendas líquidas" value={money(point.netSales)} color="bg-success" />
      <div className="mt-2 border-t border-border/60 pt-2">
        <TooltipRow
          label="Taxa de realização"
          value={realization == null ? "—" : percent(realization)}
        />
        <TooltipRow label="Pedidos pagos" value={integer(point.paidOrders)} />
      </div>
    </div>
  );
}

function TooltipRow({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {color ? <span className={cn("h-2 w-2 rounded-full", color)} /> : null}
        {label}
      </span>
      <strong className="tabular-nums">{value}</strong>
    </div>
  );
}
