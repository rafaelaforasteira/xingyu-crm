"use client";
import { HelpCircle } from "lucide-react";
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
import { REACTIVATION_DAYS } from "./sales-tracking-rules";
import type { SalesTrackingData, Trend } from "./sales-tracking-types";
import { FinancialFunnel } from "./financial-funnel";
import {
  money,
  percentage as percent,
  SalesTrend as TrendIndicator,
} from "./sales-overview-format";
const integer = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const tooltipStyle = {
  borderRadius: 14,
  borderColor: "hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
};
export function SalesHero({ data }: { data: SalesTrackingData }) {
  const reduced = useReducedMotion();
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
        <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <section
            className="min-w-0 rounded-2xl bg-gradient-to-b from-warning/[0.025] to-success/[0.025] p-4 sm:p-5"
            aria-label="Fluxo financeiro"
          >
            <FinancialFunnel flow={overview.financialFlow} isMock={data.source === "mock"} />
          </section>

          <section
            className="flex min-w-0 flex-col rounded-2xl bg-slate-50/60 p-4 sm:p-5"
            aria-label="Inteligência das vendas realizadas"
          >
            <div className="grid flex-1 grid-cols-1 gap-3 min-[380px]:grid-cols-2">
              <PrimaryMetric
                tone="primary"
                label="LTV médio"
                value={money(overview.averageLtv)}
                detail="dos compradores do período"
                trend={overview.trends.averageLtv}
                help="Valor líquido acumulado pelos compradores selecionados ao longo do relacionamento até o fim do período analisado."
              />
              <PrimaryMetric
                label="Tempo médio até recompra"
                value={`${overview.averageRepurchaseDays} dias`}
                detail="entre compras válidas"
                trend={overview.trends.averageRepurchaseDays}
              />
              <PrimaryMetric
                tone="success"
                label="Receita de recompra"
                value={percent(overview.repeatRevenuePercentage)}
                detail={money(overview.repeatRevenue)}
                trend={overview.trends.repeatRevenue}
              />
              <PrimaryMetric
                tone="primary"
                label="Clientes reativados"
                value={integer(overview.reactivatedCustomers)}
                detail={`${percent(overview.reactivatedCustomersPercentage)} dos compradores`}
                trend={overview.trends.reactivatedCustomers}
                help={`Retornaram após pelo menos ${REACTIVATION_DAYS} dias sem comprar.`}
              />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
              <SecondaryMetric label="Pedidos pagos" value={integer(overview.paidOrders)} />
              <SecondaryMetric label="Compradores" value={integer(overview.buyers)} />
              <SecondaryMetric label="Ticket médio" value={money(overview.averageTicket)} />
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.7fr_0.8fr]">
          <section
            className="min-w-0 rounded-2xl bg-muted/25 p-3 sm:p-5"
            aria-label="Evolução das vendas"
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-semibold">Evolução das vendas</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Vendas brutas e líquidas ao longo do período.
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
                      format(parseISO(date), "dd MMM", { locale: ptBR }).replace(".", "")
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
                    type="monotone"
                    dataKey="grossSales"
                    name="Vendas brutas"
                    stroke="hsl(var(--warning))"
                    strokeWidth={2}
                    fill="url(#grossSalesGradient)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={!reduced}
                    animationDuration={500}
                  />
                  <Area
                    type="monotone"
                    dataKey="netSales"
                    name="Vendas líquidas"
                    stroke="hsl(var(--success))"
                    strokeWidth={2.5}
                    fill="url(#netSalesGradient)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={!reduced}
                    animationDuration={550}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section
            className="min-w-0 rounded-2xl bg-primary/[0.025] p-4 sm:p-5"
            aria-label="Origem da receita líquida"
          >
            <h3 className="font-semibold">Origem da receita líquida</h3>
            <p className="mt-1 text-xs text-muted-foreground">Primeira compra versus recompra.</p>
            <div className="relative mx-auto mt-3 h-[220px] max-w-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={composition}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={92}
                    paddingAngle={3}
                    cornerRadius={5}
                    stroke="none"
                    isAnimationActive={!reduced}
                    animationDuration={500}
                  >
                    {composition.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [money(Number(value)), name]}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <strong className="text-2xl font-semibold tracking-tight tabular-nums">
                  {compactMoney(overview.netSales)}
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

function PrimaryMetric({
  label,
  value,
  detail,
  trend,
  help,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  trend: Trend | null;
  help?: string;
  tone?: "primary" | "success" | "neutral";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-center rounded-2xl p-4 shadow-sm transition-shadow hover:shadow-soft",
        tone === "primary" && "bg-primary/[0.065]",
        tone === "success" && "bg-success/[0.08]",
        tone === "neutral" && "bg-slate-100/70",
      )}
    >
      <div className="flex items-center gap-1">
        <p className="text-xs text-slate-600">{label}</p>
        {help ? (
          <span tabIndex={0} title={help} aria-label={`${label}: ${help}`}>
            <HelpCircle className="h-3 w-3 text-slate-500" />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 text-slate-900 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
          tone === "primary" && "text-primary",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">{detail}</p>
      <div className="mt-2">
        <TrendIndicator trend={trend} />
      </div>
    </div>
  );
}

function SecondaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-100/80 px-3 py-3">
      <p className="text-[11px] text-slate-600">{label}</p>
      <p className="mt-1 text-slate-900 text-base font-semibold tabular-nums sm:text-lg">{value}</p>
    </div>
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

const compactMoney = (value: number) =>
  value >= 1_000_000
    ? `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
    : value >= 1000
      ? `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`
      : `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;

function SalesTimelineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: { date: string; grossSales: number; netSales: number; paidOrders: number };
  }>;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const realization = point.grossSales ? (point.netSales / point.grossSales) * 100 : null;
  const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${point.date}T12:00:00`))
    .replace(".", "");
  return (
    <div className="min-w-48 rounded-xl border border-border bg-card p-3 text-xs shadow-soft">
      <p className="mb-2 font-semibold">{date}</p>
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

function TooltipRow({ label, value, color }: { label: string; value: string; color?: string }) {
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
