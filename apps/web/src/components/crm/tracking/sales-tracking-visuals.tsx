"use client";

import { HeartHandshake, HelpCircle, History, UserPlus } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/components/crm/dashboard/analytics-charts";
import { REACTIVATION_DAYS } from "./sales-tracking-rules";
import type { CustomerStatus, SalesTrackingData } from "./sales-tracking-types";

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
const integer = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const percent = (value: number) =>
  `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
const tooltipStyle = {
  borderRadius: 12,
  borderColor: "hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
  boxShadow: "0 12px 30px rgba(30,20,60,.12)",
};

function ConceptTitle({ title, help }: { title: string; help?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <CardTitle>{title}</CardTitle>
      {help ? (
        <span
          tabIndex={0}
          title={help}
          aria-label={`${title}: ${help}`}
          className="text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}

export { SalesHero } from "./sales-overview";

export function CustomerOrigin({ data }: { data: SalesTrackingData }) {
  const { summary } = data;
  const rows = [
    {
      label: "Clientes novos",
      help: "Primeira compra válida da história realizada no período.",
      customers: summary.newCustomers,
      customerShare:
        summary.buyersCount > 0 ? (summary.newCustomers / summary.buyersCount) * 100 : 0,
      revenue: summary.newRevenue,
      revenueShare: summary.newRevenuePercentage,
      icon: UserPlus,
      color: "bg-violet-400",
      surface: "bg-primary/[0.06] border-primary/10",
      accent: "text-primary",
      iconSurface: "bg-primary/10",
    },
    {
      label: "Clientes da base",
      help: "Já possuíam ao menos uma compra válida antes do período.",
      customers: summary.existingCustomers,
      customerShare:
        summary.buyersCount > 0 ? (summary.existingCustomers / summary.buyersCount) * 100 : 0,
      revenue: summary.repeatRevenue,
      revenueShare: summary.repeatRevenuePercentage,
      icon: History,
      color: "bg-success/70",
      surface: "bg-success/[0.07] border-success/10",
      accent: "text-success",
      iconSurface: "bg-success/10",
    },
  ];
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Quem gerou as vendas?</CardTitle>
        <p className="text-xs text-slate-500">
          Entenda quanto do período veio de novos clientes e quanto veio da base existente.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className={cn("rounded-xl border p-4", row.surface)}>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    row.accent,
                    row.iconSurface,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold">{row.label}</p>
                  <p className="text-[11px] text-slate-500">{row.help}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className={cn("text-2xl font-semibold tabular-nums", row.accent)}>
                    {integer(row.customers)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {percent(row.customerShare)} dos compradores
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn("text-lg font-semibold tabular-nums", row.accent)}>
                    {money(row.revenue)}
                  </p>
                  <p className="text-xs text-slate-500">{percent(row.revenueShare)} da receita</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300 motion-reduce:transition-none",
                    row.color,
                  )}
                  style={{ width: `${row.revenueShare}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function PurchaseStageChart({ data }: { data: SalesTrackingData }) {
  const reduced = useReducedMotion();
  return (
    <Card className="min-w-0 rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Primeira compra × recompra</CardTitle>
        <p className="text-xs text-muted-foreground">
          Distribuição dos pedidos pela posição da compra na jornada do cliente.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-72" aria-label="Distribuição dos pedidos por número da compra">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.purchaseStages} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.18} />
              <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={44} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number, name: string, item) =>
                  name === "orders"
                    ? [
                        `${integer(Number(value))} pedidos · ${percent(Number(item.payload.percentage))} · ${money(Number(item.payload.revenue))}`,
                        "Resultado",
                      ]
                    : [value, name]
                }
              />
              <Bar
                dataKey="orders"
                name="Pedidos"
                fill="hsl(var(--primary))"
                radius={[7, 7, 0, 0]}
                isAnimationActive={!reduced}
                animationDuration={650}
              >
                {data.purchaseStages.map((stage, index) => (
                  <Cell
                    key={stage.stage}
                    fill={
                      index === 0
                        ? "hsl(var(--primary) / 0.55)"
                        : `hsl(var(--success) / ${Math.min(0.4 + index * 0.1, 0.9)})`
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function RepurchaseAnalysis({ data }: { data: SalesTrackingData }) {
  const { summary } = data;
  const fastShare = data.repurchaseBuckets
    .filter((row) => row.maxDays != null && row.maxDays <= 60)
    .reduce((sum, row) => sum + row.percentage, 0);
  const largestShare = Math.max(0, ...data.repurchaseBuckets.map((row) => row.percentage));
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <ConceptTitle
          title="Tempo até a recompra"
          help="Intervalo entre compras válidas consecutivas do mesmo cliente."
        />
        <p className="text-xs text-muted-foreground">
          Média, mediana e distribuição dos clientes por intervalo de retorno.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Metric label="Tempo médio" value={`${summary.averageRepurchaseDays} dias`} />
          <Metric
            label="Tempo mediano"
            help="Metade dos intervalos de retorno está abaixo da mediana e metade acima."
            value={`${summary.medianRepurchaseDays} dias`}
          />
          <Metric
            label="1ª → 2ª compra"
            value={`${summary.firstToSecondPurchaseDays} dias`}
            accent
          />
        </div>
        <div className="flex min-w-0 flex-col justify-center">
          <div className="space-y-5">
            {data.repurchaseBuckets.map((row) => (
              <div
                key={row.label}
                className="grid items-center gap-3 grid-cols-[100px_minmax(0,1fr)] sm:grid-cols-[135px_minmax(0,1fr)]"
              >
                <span
                  className={cn(
                    "text-xs text-slate-600",
                    row.percentage > 0 &&
                      row.percentage === largestShare &&
                      "font-semibold text-foreground",
                  )}
                >
                  {row.minDays === 181 && row.maxDays == null ? "Mais de 180 dias" : row.label}
                </span>
                <div className="pr-14">
                  <div className="relative">
                    <div
                      className="h-3.5 overflow-hidden rounded-full bg-slate-100"
                      role="img"
                      aria-label={`${row.label}: ${percent(row.percentage)} dos clientes, ${row.customers} clientes, ${money(row.revenue)}`}
                    >
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                          row.maxDays != null && row.maxDays <= 60
                            ? "bg-success/45"
                            : row.maxDays != null && row.maxDays <= 90
                              ? "bg-primary/35"
                              : "bg-slate-300",
                          row.percentage > 0 &&
                            row.percentage === largestShare &&
                            (row.maxDays != null && row.maxDays <= 60
                              ? "bg-success/60"
                              : row.maxDays != null && row.maxDays <= 90
                                ? "bg-primary/50"
                                : "bg-slate-400"),
                        )}
                        style={{ width: `${row.percentage}%` }}
                      />
                    </div>
                    <strong
                      className="absolute top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap text-xs tabular-nums text-slate-700"
                      style={{ left: `${row.percentage}%` }}
                    >
                      {percent(row.percentage)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-600">
            <strong className="text-lg font-semibold text-success">{percent(fastShare)}</strong> dos
            clientes que recompraram retornaram em até 60 dias.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  accent,
  help,
}: {
  label: string;
  value: string;
  accent?: boolean;
  help?: string;
}) {
  return (
    <div className={cn("rounded-xl p-4", accent ? "bg-primary/[0.065]" : "bg-slate-50")}>
      <div className="flex items-center gap-1.5">
        <p className="text-xs text-slate-600">{label}</p>
        {help && (
          <span
            tabIndex={0}
            title={help}
            aria-label={help}
            className="rounded text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          accent ? "text-primary" : "text-slate-900",
        )}
      >
        {value.endsWith(" dias") ? (
          <>
            {value.slice(0, -5)} <span className="text-sm font-normal text-slate-500">dias</span>
          </>
        ) : (
          value
        )}
      </p>
    </div>
  );
}

export function RelationshipFlow({ data }: { data: SalesTrackingData }) {
  const stages = data.purchaseStages;
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Evolução da relação com o cliente</CardTitle>
        <p className="text-xs text-muted-foreground">
          Distribuição dos compradores do período por etapa de compra. Percentuais sobre o total de
          compradores.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {stages.map((stage, index) => (
            <div
              key={stage.stage}
              className={cn(
                "relative rounded-xl border p-4 text-center",
                index === 0
                  ? "border-primary/10 bg-primary/[0.06]"
                  : "border-success/10 bg-success/[0.06]",
              )}
            >
              <p className="text-xs font-medium text-slate-600">
                {stage.stage === "6ª+" ? "6ª compra ou mais" : stage.stage}
              </p>
              <p
                className={cn(
                  "mt-2 text-2xl font-semibold tabular-nums",
                  index === 0 ? "text-primary" : "text-success",
                )}
              >
                {integer(stage.customers)}
              </p>
              <p className="text-xs text-slate-500">
                {percent(
                  data.summary.buyersCount > 0
                    ? (stage.customers / data.summary.buyersCount) * 100
                    : 0,
                )}
              </p>
              {index < stages.length - 1 ? (
                <span className="absolute -right-2 top-1/2 z-10 hidden h-px w-2 bg-success/20 xl:block" />
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ValueAndReactivation({ data }: { data: SalesTrackingData }) {
  const { summary } = data;
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <ConceptTitle
            title="LTV dos compradores do período"
            help="Valor histórico acumulado das compras válidas dos clientes que compraram no período selecionado."
          />
          <p className="text-xs text-muted-foreground">
            Histórico completo da relação, não apenas a receita do recorte.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {data.ltv.map((item) => (
            <Metric
              key={item.key}
              label={item.label}
              value={money(item.value)}
              accent={item.key === "all"}
            />
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-emerald-100 bg-emerald-50/25 shadow-soft">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <HeartHandshake className="h-4 w-4" />
            </span>
            <div>
              <CardTitle>Clientes reativados</CardTitle>
              <p className="text-xs text-muted-foreground">
                Retorno após {REACTIVATION_DAYS}+ dias sem comprar.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Metric label="Clientes" value={integer(summary.reactivatedCustomers)} />
          <Metric label="Vendas no período" value={money(summary.reactivatedRevenue)} />
          <Metric label="LTV médio" value={money(summary.reactivatedAverageLtv)} />
          <Metric
            label="Inatividade média"
            value={`${summary.reactivatedAverageInactiveDays} dias`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

const healthTone: Record<
  CustomerStatus,
  "default" | "success" | "warning" | "destructive" | "secondary"
> = {
  NEW: "default",
  RECURRING: "success",
  REACTIVATED: "secondary",
  AT_RISK: "warning",
  INACTIVE: "destructive",
};
export function CustomerHealth({ data }: { data: SalesTrackingData }) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Saúde da base</CardTitle>
        <p className="text-xs text-muted-foreground">
          Classificação dos compradores conforme seu momento de relacionamento.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {data.health.map((item) => (
            <div key={item.status} className="rounded-xl border border-border/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={healthTone[item.status]}>{item.label}</Badge>
                <strong className="text-sm tabular-nums">{percent(item.percentage)}</strong>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{integer(item.customers)}</p>
              <p className="text-xs text-muted-foreground">clientes no período</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function RevenueMix({ data }: { data: SalesTrackingData }) {
  const { summary } = data;
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Receita nova × receita de recompra</CardTitle>
        <p className="text-xs text-muted-foreground">
          Participação das primeiras compras e das compras seguintes.
        </p>
      </CardHeader>
      <CardContent>
        <div
          className="flex h-4 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${percent(summary.newRevenuePercentage)} de primeira compra e ${percent(summary.repeatRevenuePercentage)} de recompra`}
        >
          <div className="bg-violet-400" style={{ width: `${summary.newRevenuePercentage}%` }} />
          <div className="bg-primary" style={{ width: `${summary.repeatRevenuePercentage}%` }} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border/70 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> Primeira compra
            </div>
            <p className="mt-1 text-lg font-semibold">{percent(summary.newRevenuePercentage)}</p>
            <p className="text-xs text-muted-foreground">{money(summary.newRevenue)}</p>
          </div>
          <div className="rounded-xl border border-border/70 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Recompra
            </div>
            <p className="mt-1 text-lg font-semibold">{percent(summary.repeatRevenuePercentage)}</p>
            <p className="text-xs text-muted-foreground">{money(summary.repeatRevenue)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const trackingFormatters = { money, integer, percent, healthTone };
