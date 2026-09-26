"use client";
import type { CSSProperties, ReactNode } from "react";
import { UserPlus, Users } from "lucide-react";
import { AnimatedMetric, useInViewOnce, useTrackingMotion } from "./tracking-motion";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  LabelList,
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

const SURFACE =
  "min-w-0 rounded-2xl border-0 bg-[color-mix(in_srgb,hsl(var(--muted))_25%,hsl(var(--card)))] shadow-none";
const PROFILE_SURFACE =
  "rounded-xl bg-[color-mix(in_srgb,hsl(var(--muted))_46%,hsl(var(--card)))]";
const STAGE_FILLS = [
  "hsl(var(--primary))",
  "hsl(152 55% 48%)",
  "hsl(152 58% 40%)",
  "hsl(154 62% 34%)",
  "hsl(var(--success))",
  "hsl(158 64% 22%)",
];

export function CustomerMix({ data }: { data: SalesTrackingData }) {
  const reveal = useInViewOnce<HTMLDivElement>(0.25);
  return (
    <div
      ref={reveal.ref}
      data-revealed={reveal.seen ? "true" : "false"}
      className={styles.mix + " grid items-stretch gap-4 xl:grid-cols-2"}
    >
      <CustomerOrigin data={data} animate={reveal.seen} />
      <PurchaseStageChart data={data} animate={reveal.seen} />
    </div>
  );
}

export function CustomerOrigin({
  data,
  animate = true,
}: {
  data: SalesTrackingData;
  animate?: boolean;
}) {
  const { summary } = data;
  const rows = [
    {
      label: "Novos clientes",
      help: METRIC_DEFINITIONS.newCustomer,
      count: summary.newCustomers,
      revenue: summary.newRevenue,
      share: summary.newRevenuePercentage,
      accent: "text-primary",
      bar: "hsl(var(--primary))",
      icon: UserPlus,
    },
    {
      label: "Base existente",
      help: METRIC_DEFINITIONS.existingCustomer,
      count: summary.existingCustomers,
      revenue: summary.existingRevenue,
      share: summary.existingRevenuePercentage,
      accent: "text-success",
      bar: "hsl(var(--success))",
      icon: Users,
    },
  ];
  return (
    <Card className={SURFACE + " flex h-full flex-col " + styles.mixCard}>
      <CardHeader className="space-y-1 px-4 pb-0 pt-4">
        <CardTitle>Novos clientes × base existente</CardTitle>
        <p className="text-xs text-muted-foreground">
          Quem comprou neste período e quanto cada perfil gerou.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-3">
        {rows.map((row) => {
          const buyerShare = summary.buyersCount ? (row.count / summary.buyersCount) * 100 : null;
          const Icon = row.icon;
          return (
            <div key={row.label} className={PROFILE_SURFACE + " px-3 py-2.5"}>
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Icon className={"h-3.5 w-3.5 shrink-0 " + row.accent} aria-hidden />
                {row.label}
                <ConceptHelp label={row.label} text={row.help} />
              </div>
              <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5">
                <div className="min-w-0">
                  <strong className={"text-xl font-semibold tabular-nums " + row.accent}>
                    <AnimatedMetric value={row.count} format={integer} duration={520} active={animate} />
                  </strong>
                  <span className="ml-1 text-xs text-muted-foreground">compradores</span>
                </div>
                <strong className="text-right font-semibold tabular-nums text-foreground">
                  <AnimatedMetric value={row.revenue} format={money} duration={520} active={animate} />
                </strong>
                <p className="text-xs text-muted-foreground">
                  <AnimatedMetric value={buyerShare} format={percentage} duration={420} active={animate} />{" "}
                  dos compradores
                </p>
                <p className="text-right text-xs text-muted-foreground">
                  <AnimatedMetric value={row.share} format={percentage} duration={420} active={animate} /> da receita
                </p>
              </div>
              <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full motion-reduce:transition-none"
                  style={{
                    width: animate ? Math.max(0, Math.min(100, row.share ?? 0)) + "%" : "0%",
                    background: row.bar,
                    transition: "width 320ms ease-out",
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
export function PurchaseStageChart({
  data,
  animate = true,
}: {
  data: SalesTrackingData;
  animate?: boolean;
}) {
  const reduced = useReducedMotion();
  const { initial } = useTrackingMotion();
  return (
    <Card
      className={SURFACE + " flex h-full flex-col " + styles.mixCard}
      style={{ "--delay": "40ms" } as CSSProperties}
    >
      <CardHeader className="space-y-1 px-4 pb-0 pt-4">
        <CardTitle className="flex items-center gap-1">
          Distribuição por número da compra
          <ConceptHelp
            label="Distribuição por número da compra"
            text="Cada barra representa pedidos classificados pela posição daquela compra no histórico do cliente. Um mesmo comprador pode gerar mais de um pedido dentro do período analisado."
          />
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Pedidos pela posição no histórico de compras válidas.
        </p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
        <div className="min-h-[220px] flex-1" aria-label="Distribuição de pedidos por número da compra">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer
              data={data.purchaseStages}
              margin={{ top: 22, right: 8, left: -18, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="hsl(var(--muted-foreground) / 0.16)"
                strokeDasharray="3 4"
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
                cursor={{ fill: "hsl(var(--muted-foreground) / 0.08)" }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as PurchaseStageDistribution | undefined;
                  const index = row ? data.purchaseStages.findIndex((stage) => stage.stage === row.stage) : -1;
                  return active && row ? (
                    <ChartTooltip
                      title={row.stage + " compra"}
                      accent={STAGE_FILLS[index] ?? STAGE_FILLS[0]}
                      rows={[
                        ["Pedidos", integer(row.orders)],
                        ["Dos pedidos do período", percentage(row.percentage)],
                        ["Receita líquida", money(row.revenue)],
                      ]}
                    />
                  ) : null;
                }}
              />
              <Bar
                key={animate ? "purchase-draw" : "purchase-hold"}
                dataKey="orders"
                radius={[4, 4, 0, 0]}
                maxBarSize={46}
                isAnimationActive={animate && !reduced}
                animationDuration={initial ? 420 : 320}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="orders"
                  position="top"
                  offset={6}
                  formatter={(value: number) => integer(value)}
                  style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                />
                {data.purchaseStages.map((stage, index) => (
                  <Cell key={stage.stage} fill={STAGE_FILLS[index] ?? STAGE_FILLS[STAGE_FILLS.length - 1]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Um mesmo comprador pode gerar uma primeira compra e uma recompra no período.
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
