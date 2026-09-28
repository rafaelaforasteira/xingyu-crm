"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { UserPlus, Users, type LucideIcon } from "lucide-react";
import { AnimatedMetric, AnimatedProgress, useInViewOnce, useTrackingMotion } from "./tracking-motion";
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

/** Receita do grupo dividida pelos compradores do grupo. Pronto para um KPI futuro. */
export function averageRevenuePerBuyer(revenue: number, buyers: number) {
  if (!Number.isFinite(revenue) || !Number.isFinite(buyers) || buyers <= 0) return null;
  return revenue / buyers;
}

function compactProfileMoney(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  if (absolute < 1000) return money(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: absolute >= 1_000_000 ? 1 : 0,
    minimumFractionDigits: 0,
  }).format(value);
}

type ProfileId = "new" | "existing";

const PROFILE_ACCENT: Record<ProfileId, string> = {
  new: "hsl(var(--primary))",
  existing: "hsl(187 45% 34%)",
};

type CustomerProfile = {
  id: ProfileId;
  label: string;
  help: string;
  count: number;
  buyersTotal: number;
  buyerShare: number | null;
  revenue: number;
  revenueShare: number | null;
  averageRevenue: number | null;
  icon: LucideIcon;
};

export function CustomerOrigin({
  data,
  animate = true,
}: {
  data: SalesTrackingData;
  animate?: boolean;
}) {
  const { summary } = data;
  const buyerShare = (count: number) =>
    summary.buyersCount > 0 ? (count / summary.buyersCount) * 100 : null;
  const profiles: CustomerProfile[] = [
    {
      id: "new",
      label: "Novos clientes",
      help: METRIC_DEFINITIONS.newCustomer,
      count: summary.newCustomers,
      buyersTotal: summary.buyersCount,
      buyerShare: buyerShare(summary.newCustomers),
      revenue: summary.newRevenue,
      revenueShare: summary.newRevenuePercentage,
      averageRevenue: averageRevenuePerBuyer(summary.newRevenue, summary.newCustomers),
      icon: UserPlus,
    },
    {
      id: "existing",
      label: "Base existente",
      help: METRIC_DEFINITIONS.existingCustomer,
      count: summary.existingCustomers,
      buyersTotal: summary.buyersCount,
      buyerShare: buyerShare(summary.existingCustomers),
      revenue: summary.existingRevenue,
      revenueShare: summary.existingRevenuePercentage,
      averageRevenue: averageRevenuePerBuyer(summary.existingRevenue, summary.existingCustomers),
      icon: Users,
    },
  ];
  return (
    <Card className={SURFACE + " flex h-full flex-col " + styles.mixCard}>
      <CardHeader className="gap-1.5 px-5 pb-0 pt-5">
        <CardTitle>Novos clientes × base existente</CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Quem comprou neste período e quanto cada perfil gerou.
        </p>
      </CardHeader>
      <CardContent className={"flex flex-1 flex-col px-5 pb-5 pt-5 " + (styles.profileFrame ?? "")}>
        <div className={styles.profileBoard}>
          {profiles.map((profile) => (
            <ProfileColumn key={profile.id} profile={profile} animate={animate} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileColumn({ profile, animate }: { profile: CustomerProfile; animate: boolean }) {
  return (
    <div className={styles.profileColumn}>
      <ProfileCard profile={profile} animate={animate} />
      <ProfileDetail
        profile={profile}
        animate={animate}
        title="Composição dos compradores"
        value={profile.buyerShare}
        hint="dos compradores do período"
        tipTitle="Composição dos compradores"
        tipRows={[
          ["Compradores", integer(profile.count)],
          ["Total do período", integer(profile.buyersTotal)],
          ["Participação", percentage(profile.buyerShare) + " dos compradores"],
        ]}
      />
      <ProfileDetail
        profile={profile}
        animate={animate}
        title="Composição da receita líquida"
        value={profile.revenueShare}
        hint="da receita líquida do período"
        tipTitle="Composição da receita líquida"
        tipRows={[
          ["Receita líquida", money(profile.revenue)],
          ["Participação", percentage(profile.revenueShare) + " da receita líquida"],
        ]}
      />
    </div>
  );
}

function ProfileCard({ profile, animate }: { profile: CustomerProfile; animate: boolean }) {
  const Icon = profile.icon;
  return (
    <article
      className={styles.profileCard}
      data-profile={profile.id}
      data-average-revenue={profile.averageRevenue ?? undefined}
    >
      <div className={styles.profileIdentity}>
        <span className={styles.profileMark} data-profile={profile.id}>
          <Icon size={15} aria-hidden />
        </span>
        <p className={styles.profileName}>{profile.label}</p>
        <ConceptHelp label={profile.label} text={profile.help} />
      </div>
      <div className={styles.profileMetrics}>
        <p className={styles.profileBuyers} data-profile={profile.id}>
          <AnimatedMetric value={profile.count} format={integer} duration={520} active={animate} />
        </p>
        <RevenueValue profile={profile} animate={animate} />
        <p className={styles.profileCaption}>Compradores</p>
        <p className={styles.profileCaption}>Receita líquida</p>
        <ShareValue
          profile={profile}
          animate={animate}
          className={styles.profileShare ?? ""}
          value={profile.buyerShare}
          tipTitle="Composição dos compradores"
          tipRows={[
            ["Compradores", integer(profile.count)],
            ["Total do período", integer(profile.buyersTotal)],
            ["Participação", percentage(profile.buyerShare) + " dos compradores"],
          ]}
        />
        <ShareValue
          profile={profile}
          animate={animate}
          className={styles.profileShare ?? ""}
          value={profile.revenueShare}
          tipTitle="Composição da receita líquida"
          tipRows={[
            ["Receita líquida", money(profile.revenue)],
            ["Participação", percentage(profile.revenueShare) + " da receita líquida"],
          ]}
        />
        <p className={styles.profileCaption}>dos compradores</p>
        <p className={styles.profileCaption}>da receita líquida</p>
      </div>
    </article>
  );
}

function ProfileDetail({
  profile,
  animate,
  title,
  value,
  hint,
  tipTitle,
  tipRows,
}: {
  profile: CustomerProfile;
  animate: boolean;
  title: string;
  value: number | null;
  hint: string;
  tipTitle: string;
  tipRows: Array<[string, string]>;
}) {
  return (
    <article className={styles.profileDetail} data-profile={profile.id}>
      <div className={styles.profileDetailLabel}>
        <span className={styles.profileDot} data-profile={profile.id} aria-hidden />
        <span>{title}</span>
      </div>
      <div className={styles.profileDetailAside}>
        <ShareValue
          profile={profile}
          animate={animate}
          className={styles.profileDetailValue ?? ""}
          value={value}
          tipTitle={tipTitle}
          tipRows={tipRows}
        />
        <p className={styles.profileDetailHint}>{hint}</p>
      </div>
    </article>
  );
}

function RevenueValue({ profile, animate }: { profile: CustomerProfile; animate: boolean }) {
  const full = money(profile.revenue);
  return (
    <HoverTip
      title="Receita líquida gerada"
      accent={PROFILE_ACCENT[profile.id]}
      rows={[
        ["Valor completo", full],
        ["Perfil", profile.label],
        ["Participação", percentage(profile.revenueShare) + " da receita líquida"],
      ]}
      className={styles.profileMoney ?? ""}
      label={"Receita líquida gerada: " + full + ". Perfil: " + profile.label}
    >
      <AnimatedMetric value={profile.revenue} format={compactProfileMoney} duration={520} active={animate} />
    </HoverTip>
  );
}

function ShareValue({
  profile,
  animate,
  className,
  value,
  tipTitle,
  tipRows,
}: {
  profile: CustomerProfile;
  animate: boolean;
  className: string;
  value: number | null;
  tipTitle: string;
  tipRows: Array<[string, string]>;
}) {
  return (
    <HoverTip
      title={tipTitle}
      accent={PROFILE_ACCENT[profile.id]}
      rows={tipRows}
      className={className}
      profile={profile.id}
      label={tipRows.map(([name, item]) => name + ": " + item).join(". ")}
    >
      <AnimatedMetric value={value} format={percentage} duration={420} active={animate} />
    </HoverTip>
  );
}

let closeProfileTip: (() => void) | null = null;

function HoverTip({
  title,
  rows,
  accent,
  label,
  className,
  profile,
  style,
  children,
}: {
  title: string;
  rows: Array<[string, string]>;
  accent: string;
  label: string;
  className: string;
  profile?: ProfileId;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  const show = () => {
    closeProfileTip?.();
    closeProfileTip = () => setOpen(false);
    setOpen(true);
  };
  const hide = () => setOpen(false);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = tip.current?.offsetWidth || 220;
      const height = tip.current?.offsetHeight || 108;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
      const above = rect.top - height - 8;
      setBox({ left, top: above >= 8 ? above : rect.bottom + 8 });
    };
    place();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={className}
        data-profile={profile}
        style={style}
        aria-label={label}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
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
