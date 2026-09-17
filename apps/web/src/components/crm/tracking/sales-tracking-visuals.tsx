"use client";
import type { ReactNode } from "react";
import { AnimatedMetric, AnimatedProgress, useTrackingMotion } from "./tracking-motion";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReducedMotion } from "@/components/crm/dashboard/analytics-charts";
import { REACTIVATION_DAYS } from "./sales-tracking-rules";
import { ConceptHelp, ChartTooltip } from "./tracking-help";
import { METRIC_DEFINITIONS } from "./tracking-dictionary";
import { money, integer, percentage, days } from "./tracking-format";
import type { PurchaseStageDistribution, SalesTrackingData } from "./sales-tracking-types";
import styles from "./tracking-overview.module.css";
export { SalesHero } from "./sales-overview";

export function CustomerOrigin({ data }: { data: SalesTrackingData }) {
  const { summary } = data;
  const rows = [
    {
      label: "Novos clientes",
      help: METRIC_DEFINITIONS.newCustomer,
      count: summary.newCustomers,
      revenue: summary.newRevenue,
      share: summary.newRevenuePercentage,
      accent: "text-primary",
      surface: "bg-primary/[0.055]",
      bar: "bg-primary/65",
    },
    {
      label: "Base existente",
      help: METRIC_DEFINITIONS.existingCustomer,
      count: summary.existingCustomers,
      revenue: summary.existingRevenue,
      share: summary.existingRevenuePercentage,
      accent: "text-success",
      surface: "bg-success/[0.055]",
      bar: "bg-success/65",
    },
  ];
  return (
    <Card className="min-w-0 rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Novos clientes × base existente</CardTitle>
        <p className="text-xs text-muted-foreground">
          Quem comprou neste período e quanto cada perfil gerou.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className={"rounded-xl p-4 " + row.surface}>
            <div className="flex items-center gap-1 text-sm font-medium">
              {row.label}
              <ConceptHelp label={row.label} text={row.help} />
            </div>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <strong className={"text-2xl font-semibold tabular-nums " + row.accent}>
                  <AnimatedMetric value={row.count} format={integer} duration={550} />
                </strong>
                <span className="ml-1 text-xs text-muted-foreground">compradores</span>
                <p className="mt-1 text-xs text-muted-foreground">
                  {percentage(summary.buyersCount ? (row.count / summary.buyersCount) * 100 : null)}{" "}
                  dos compradores
                </p>
              </div>
              <div className="text-right">
                <strong className="font-semibold tabular-nums">
                  <AnimatedMetric value={row.revenue} format={money} duration={550} />
                </strong>
                <p className="mt-1 text-xs text-muted-foreground">
                  <AnimatedMetric value={row.share} format={percentage} duration={550} /> da receita
                </p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card/80">
              <AnimatedProgress value={row.share} className={row.bar} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
export function PurchaseStageChart({ data }: { data: SalesTrackingData }) {
  const reduced = useReducedMotion();
  const { revision, initial } = useTrackingMotion();
  return (
    <Card className="min-w-0 rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Distribuição por número da compra</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pedidos pela posição no histórico de compras válidas.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64" aria-label="Distribuição de pedidos por número da compra">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer
              data={data.purchaseStages}
              margin={{ top: 16, right: 8, left: -15, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--border))"
                strokeDasharray="3 4"
                opacity={0.45}
              />
              <XAxis
                dataKey="stage"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--primary) / .035)" }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as PurchaseStageDistribution | undefined;
                  return active && row ? (
                    <ChartTooltip
                      title={row.stage + " compra"}
                      rows={[
                        ["Pedidos", integer(row.orders)],
                        ["Participação nos pedidos", percentage(row.percentage)],
                        ["Receita líquida", money(row.revenue)],
                        ["Participação na receita", percentage(row.revenueShare)],
                        ["Ticket médio", money(row.averageTicket)],
                      ]}
                    />
                  ) : null;
                }}
              />
              <Bar
                key={revision}
                dataKey="orders"
                radius={[7, 7, 0, 0]}
                maxBarSize={48}
                isAnimationActive={!reduced}
                animationDuration={initial ? 550 : 350}
              >
                {data.purchaseStages.map((stage, index) => (
                  <Cell
                    key={stage.stage}
                    fill={
                      index === 0
                        ? "hsl(var(--primary))"
                        : "hsl(var(--success) / " + (0.4 + index * 0.09) + ")"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Uma pessoa pode gerar uma primeira compra e uma recompra no mesmo período.
        </p>
      </CardContent>
    </Card>
  );
}
export function RepurchaseAnalysis({ data }: { data: SalesTrackingData }) {
  const { summary, firstToSecondConversion: conversion } = data;
  const hasReturns = data.repurchaseBuckets.some((row) => row.customers > 0);
  return (
    <Card className="min-w-0 rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Tempo até a recompra</CardTitle>
        <p className="text-xs text-muted-foreground">
          O ritmo de retorno dos compradores selecionados.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.6fr]">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Metric
              label="Tempo médio"
              value={
                <AnimatedMetric
                  value={summary.averageRepurchaseDays}
                  format={days}
                  duration={550}
                />
              }
              help={METRIC_DEFINITIONS.repurchase}
            />
            <Metric
              label="Mediana"
              value={
                <AnimatedMetric value={summary.medianRepurchaseDays} format={days} duration={550} />
              }
              help={METRIC_DEFINITIONS.median}
            />
            <Metric
              label="1ª → 2ª compra"
              value={
                <AnimatedMetric
                  value={summary.firstToSecondPurchaseDays}
                  format={days}
                  duration={550}
                />
              }
              help={METRIC_DEFINITIONS.firstToSecond}
              accent
            />
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground sm:col-span-3 lg:col-span-1">
              {conversion?.rate != null ? (
                <span>
                  Conversão 1ª → 2ª:{" "}
                  <strong className="text-primary">
                    <AnimatedMetric value={conversion.rate} format={percentage} />
                  </strong>
                </span>
              ) : (
                "Conversão ainda indisponível"
              )}
              <ConceptHelp
                label="Conversão 1ª → 2ª"
                text={
                  conversion?.rate != null
                    ? METRIC_DEFINITIONS.conversion
                    : "Ainda não existe uma coorte com tempo suficiente de observação neste recorte para calcular esta conversão com segurança. Use todos os perfis e números de compra para observar a coorte completa."
                }
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            {hasReturns ? (
              <div className="space-y-4">
                {data.repurchaseBuckets.map((row) => (
                  <div key={row.label}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        {row.label}
                        <ConceptHelp
                          label={row.label}
                          text={
                            integer(row.customers) +
                            " clientes · " +
                            percentage(row.percentage) +
                            ". Receita de recompra: " +
                            money(row.revenue) +
                            "."
                          }
                        />
                      </div>
                      <strong className="tabular-nums">{percentage(row.percentage)}</strong>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <AnimatedProgress value={row.percentage} className="bg-success/65" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-muted/50 p-6 text-sm text-muted-foreground">
                Nenhuma recompra encontrada neste recorte.
              </p>
            )}
            <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
              Faixas por cliente, considerando seu último intervalo de recompra no recorte. Média e
              mediana consideram os intervalos históricos até a data final.
            </p>
          </div>
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
  value: ReactNode;
  accent?: boolean;
  help?: string;
}) {
  return (
    <div className={"min-w-0 rounded-xl p-4 " + (accent ? "bg-primary/[0.055]" : "bg-muted/40")}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {help && <ConceptHelp label={label} text={help} />}
      </div>
      <p
        className={
          "mt-2 text-xl font-semibold tracking-tight tabular-nums " +
          (accent ? "text-primary" : "text-foreground")
        }
      >
        {value}
      </p>
    </div>
  );
}
export function ValueAndReactivation({ data }: { data: SalesTrackingData }) {
  const { reactivation } = data;
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="min-w-0 rounded-2xl shadow-soft">
        <CardHeader>
          <div className="flex items-center gap-1">
            <CardTitle>LTV por perfil de cliente</CardTitle>
            <ConceptHelp label="LTV por perfil" text={METRIC_DEFINITIONS.ltv} />
          </div>
          <p className="text-xs text-muted-foreground">
            Valor médio histórico até a data final selecionada.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.ltv.map((item, index) => (
            <div
              key={item.key}
              className={
                styles.ltvRow +
                " flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-4 py-4"
              }
              style={
                {
                  "--profile-color": [
                    "hsl(var(--primary))",
                    "hsl(248 45% 54%)",
                    "hsl(var(--success))",
                  ][index],
                } as React.CSSProperties
              }
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <strong
                className="text-xl font-semibold tabular-nums"
                style={{ color: "var(--profile-color)" }}
              >
                <AnimatedMetric value={item.value} format={money} duration={550} />
              </strong>
            </div>
          ))}
          <p className="pt-1 text-[11px] text-muted-foreground">
            Reativados são um subconjunto da base existente; os perfis não devem ser somados.
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0 rounded-2xl shadow-soft">
        <CardHeader>
          <div className="flex items-center gap-1">
            <CardTitle>Reativação</CardTitle>
            <ConceptHelp label="Reativação" text={METRIC_DEFINITIONS.reactivation} />
          </div>
          <p className="text-xs text-muted-foreground">
            Retorno após {REACTIVATION_DAYS} dias ou mais sem comprar.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
            <Metric
              label="Clientes reativados"
              value={
                <AnimatedMetric
                  value={reactivation.reactivatedCustomers}
                  format={integer}
                  duration={550}
                />
              }
            />
            <Metric
              label="Receita gerada"
              value={
                <AnimatedMetric value={reactivation.netRevenue} format={money} duration={550} />
              }
            />
            <Metric
              label="Inatividade média"
              value={
                <AnimatedMetric
                  value={reactivation.averageInactivityDays}
                  format={days}
                  duration={550}
                />
              }
            />
            <Metric
              label="Taxa de reativação"
              value={
                <AnimatedMetric
                  value={reactivation.reactivationRate}
                  format={percentage}
                  duration={550}
                />
              }
              help={METRIC_DEFINITIONS.reactivation}
              accent
            />
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            {reactivation.eligibleCustomers == null
              ? "Taxa indisponível com filtro de número da compra: a elegibilidade exige observar também quem não voltou."
              : integer(reactivation.eligibleCustomers) +
                " clientes elegíveis no período, incluindo quem ainda não voltou."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
