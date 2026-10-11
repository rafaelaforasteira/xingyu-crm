"use client";
import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  Minus,
  Lightbulb,
  ArrowRightLeft,
  BarChart3,
  PieChart,
  Repeat,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
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
import { ConceptHelp, ChartTooltip, TrackingTooltipPortal, TRACKING_TOOLTIP_LAYER, announceTrackingTooltip, useTrackingTooltipDismissal } from "./tracking-help";
import { METRIC_DEFINITIONS } from "./tracking-dictionary";
import { percentagePoints } from "./financial-funnel-format";
import { money, integer, percentage, days } from "./tracking-format";
import { dominantRepurchaseBucket } from "./tracking-action-insights";
import type {
  Trend,
  PurchaseStageDistribution,
  RepurchaseTimeBucket,
  SalesTrackingData,
} from "./sales-tracking-types";
import styles from "./tracking-overview.module.css";
import { lateRepurchaseShare } from "./repurchase-presentation";
import { getPurchaseDistributionColor } from "./purchase-stage-presentation";
export { SalesHero } from "./sales-overview";

const SURFACE =
  "min-w-0 rounded-2xl border-0 bg-[color-mix(in_srgb,hsl(var(--muted))_25%,hsl(var(--card)))] shadow-none";

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
  new: "var(--tracking-data-blue, #3478f6)",
  existing: "var(--tracking-data-orange, #f28a20)",
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
  tipTitle,
  tipRows,
}: {
  profile: CustomerProfile;
  animate: boolean;
  title: string;
  value: number | null;
  tipTitle: string;
  tipRows: Array<[string, string]>;
}) {
  return (
    <article className={styles.profileDetail} data-profile={profile.id}>
      <div className={styles.profileDetailLabel}>
        <span>{title}</span>
      </div>
      <span className={styles.profileDetailTrack} aria-hidden="true">
        <AnimatedProgress value={value ?? 0} className={styles.profileDetailFill} />
      </span>
      <ShareValue
        profile={profile}
        animate={animate}
        className={styles.profileDetailValue ?? ""}
        value={value}
        tipTitle={tipTitle}
        tipRows={tipRows}
      />
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
  tone,
  dominant,
  style,
  children,
}: {
  title: string;
  rows: Array<[string, string]>;
  accent: string;
  label: string;
  className: string;
  profile?: ProfileId;
  tone?: string;
  dominant?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  useTrackingTooltipDismissal(tooltipId, () => setOpen(false));
  const [dot, setDot] = useState(accent);
  const [box, setBox] = useState<{ left: number; top: number } | null>(null);
  const show = () => {
    closeProfileTip?.();
    closeProfileTip = () => setOpen(false);
    const fromBand = trigger.current
      ? getComputedStyle(trigger.current).getPropertyValue("--band").trim()
      : "";
    setDot(fromBand || accent);
    announceTrackingTooltip(tooltipId);
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
      setBox({ left, top: Math.max(8, Math.min(above >= 8 ? above : rect.bottom + 8, window.innerHeight - height - 8)) });
    };
    place();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const dismiss = () => setOpen(false);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
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
        data-tone={tone}
        data-dominant={dominant ? "true" : undefined}
        style={style}
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
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
              id={tooltipId}
              role="tooltip"
              data-module-theme="tracking"
              className={TRACKING_TOOLTIP_LAYER}
              style={{
                left: box?.left ?? -9999,
                top: box?.top ?? 0,
                visibility: box ? "visible" : "hidden",
              }}
            >
              <ChartTooltip accent={dot} title={title} rows={rows} />
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
      <CardHeader className="space-y-1 px-5 pb-0 pt-5">
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
      <CardContent className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-2">
        <div className="min-h-[280px] flex-1" aria-label="Distribuição de pedidos por número da compra">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              accessibilityLayer
              data={data.purchaseStages}
              barCategoryGap="18%"
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--tracking-chart-grid, hsl(var(--muted-foreground) / 0.1))"
                strokeOpacity={0.45}
              />
              <XAxis
                dataKey="stage"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                dy={4}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={32}
                domain={[0, (max: number) => (max <= 0 ? 4 : Math.ceil(max * 1.16))]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                isAnimationActive={false}
                shared={false}
                cursor={false}
                wrapperStyle={{ outline: "none", pointerEvents: "none" }}
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as PurchaseStageDistribution | undefined;
                  return active && row ? (
                    <TrackingTooltipPortal resetKey={row.stage}>
                      <ChartTooltip
                        title={row.stage + " compra"}
                        accent={getPurchaseDistributionColor(row.orders)}
                        rows={[
                          ["Pedidos", integer(row.orders)],
                          ["Participação", percentage(row.percentage) + " do total"],
                          ["Receita líquida", money(row.revenue)],
                        ]}
                      />
                    </TrackingTooltipPortal>
                  ) : null;
                }}
              />
              <Bar
                key={animate ? "purchase-draw" : "purchase-hold"}
                dataKey="orders"
                radius={[7, 7, 0, 0]}
                maxBarSize={72}
                isAnimationActive={animate && !reduced}
                animationDuration={initial ? 520 : 380}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey="orders"
                  position="top"
                  offset={8}
                  formatter={(value: number) => integer(value)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    fill: "hsl(var(--foreground))",
                  }}
                />
                {data.purchaseStages.map((stage) => (
                  <Cell key={stage.stage} fill={getPurchaseDistributionColor(stage.orders)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Um mesmo comprador pode gerar uma primeira compra e uma recompra no período.
        </p>
      </CardContent>
    </Card>
  );
}
const REPURCHASE_COLORS: Record<string, string> = {
  until30: "var(--tracking-data-green)", mid60: "var(--tracking-data-blue)",
  mid90: "var(--tracking-data-yellow)", late180: "var(--tracking-data-orange)", over180: "var(--tracking-data-red)",
};
function RepurchaseComparison({ trend }: { trend: Trend | null }) {
  const Icon = trend?.direction === "down" ? ArrowDown : trend?.direction === "up" ? ArrowUp : Minus;
  const sentiment = trend?.direction === "down" ? "positive" : trend?.direction === "up" ? "negative" : "neutral";
  return <div className={styles.repurchaseComparison}>
    <span data-sentiment={sentiment}>{trend ? <Icon size={12} aria-hidden="true" /> : null}{trend ? trend.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " dias" : "—"}</span>
    <span>vs. período anterior</span>
  </div>;
}
const REPURCHASE_TONE = {
  "Até 30 dias": "until30",
  "31–60 dias": "mid60",
  "61–90 dias": "mid90",
  "91–180 dias": "late180",
  "180+ dias": "over180",
} as const;

const REPURCHASE_METHOD =
  "Faixas calculadas com base no último intervalo de recompra no recorte. Média e mediana consideram os intervalos históricos até a data final.";

const DISTRIBUTION_HELP =
  "As faixas classificam clientes conforme o último intervalo de retorno no recorte. Média e mediana consideram os intervalos históricos até a data final.";

const WITHIN_NINETY_DAYS = 90;
const INSUFFICIENT = "Dados insuficientes para este período.";

const REPURCHASE_KPIS: Array<{
  tone: "average" | "median" | "bridge";
  label: string;
  icon: LucideIcon;
  help: string;
  read: (summary: SalesTrackingData["summary"]) => number | null;
}> = [
  {
    tone: "average",
    label: "Tempo médio",
    icon: BarChart3,
    help: "Média dos intervalos válidos entre compras dos clientes considerados na análise.",
    read: (summary) => summary.averageRepurchaseDays,
  },
  {
    tone: "median",
    label: "Mediana",
    icon: PieChart,
    help: "Valor central dos intervalos de recompra. Metade dos intervalos está abaixo deste valor e metade acima.",
    read: (summary) => summary.medianRepurchaseDays,
  },
  {
    tone: "bridge",
    label: "1ª → 2ª compra",
    icon: ArrowRightLeft,
    help: "Tempo médio entre a primeira e a segunda compra válida dos clientes elegíveis.",
    read: (summary) => summary.firstToSecondPurchaseDays,
  },
];

function repurchaseConcentration(label: string) {
  if (label.startsWith("Até ")) return "A maior concentração de recompras ocorre em " + label.charAt(0).toLowerCase() + label.slice(1) + ".";
  if (label.includes("+")) return "A maior concentração de recompras ocorre após " + label.replace("+", "") + ".";
  return "A maior concentração de recompras ocorre entre " + label.replace("–", " e ") + ".";
}

function conversionHelp(conversion: SalesTrackingData["firstToSecondConversion"]) {
  if (conversion == null) {
    return "Ainda não existe uma coorte com tempo suficiente de observação neste recorte para calcular esta conversão com segurança. Use todos os perfis e números de compra para observar a coorte completa.";
  }
  if (conversion.rate == null) {
    return "A coorte selecionada ainda não possui janela de observação suficiente para calcular a conversão.";
  }
  return METRIC_DEFINITIONS.conversion;
}

function repurchaseModel(buckets: RepurchaseTimeBucket[]) {
  const hasReturns = buckets.some((row) => row.customers > 0);
  const dominantBucket = dominantRepurchaseBucket(buckets);
  const dominantIndex = dominantBucket ? buckets.indexOf(dominantBucket) : -1;
  const bands = buckets.map((row, index) => ({
    ...row,
    tone: REPURCHASE_TONE[row.label as keyof typeof REPURCHASE_TONE] ?? "neutral",
    dominant: index === dominantIndex,
  }));
  const withinNinety = hasReturns
    ? buckets
        .filter((row) => row.maxDays != null && row.maxDays <= WITHIN_NINETY_DAYS)
        .reduce((sum, row) => sum + Math.round(row.percentage * 10) / 10, 0)
    : null;
  return {
    hasReturns,
    bands,
    dominant: dominantIndex >= 0 ? bands[dominantIndex]! : null,
    withinNinety,
    after180: lateRepurchaseShare(buckets),
  };
}

export function RepurchaseAnalysis({ data }: { data: SalesTrackingData }) {
  const { summary, firstToSecondConversion: conversion } = data;
  const reveal = useInViewOnce<HTMLDivElement>(0.2);
  const { hasReturns, bands, dominant, withinNinety, after180 } = repurchaseModel(data.repurchaseBuckets);
  const conversionRate = conversion?.rate ?? null;
  const conversionDelta =
    conversion?.deltaPoints != null && Number.isFinite(conversion.deltaPoints)
      ? conversion.deltaPoints
      : null;
  return (
    <Card className="min-w-0 rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-1">
          Tempo até a recompra
          <ConceptHelp label="Tempo até a recompra" text={REPURCHASE_METHOD} />
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          O ritmo de retorno dos compradores selecionados.
        </p>
      </CardHeader>
      <CardContent>
        <div
          ref={reveal.ref}
          className={styles.repurchaseStage}
          data-revealed={reveal.seen ? "true" : "false"}
        >
          <div className={styles.repurchaseKpis}>
            {REPURCHASE_KPIS.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <article key={kpi.tone} className={styles.repurchaseKpi} data-tone={kpi.tone}>
                  <p className={styles.repurchaseKpiLabel}>
                    <span className={styles.repurchaseIcon} aria-hidden="true">
                      <Icon />
                    </span>
                    <span>
                      {kpi.label}
                      <ConceptHelp label={kpi.label} text={kpi.help} />
                    </span>
                  </p>
                  <p className={styles.repurchaseKpiValue}>
                    <AnimatedMetric
                      value={kpi.read(summary)}
                      format={days}
                      duration={520}
                      active={reveal.seen}
                    />
                  </p>
                  <RepurchaseComparison trend={kpi.tone === "average" ? data.overview.trends.averageRepurchaseDays : null} />
                </article>
              );
            })}
            {[
              { tone: "return", label: "Retorno em até 90 dias", icon: Users, value: withinNinety, help: "Participação dos clientes que recompraram em até 90 dias no recorte.", note: withinNinety != null ? "dos clientes que recompraram" : INSUFFICIENT },
              { tone: "late-return", label: "Retorno após 180 dias", icon: Repeat, value: after180, help: "Participação dos clientes cujo último intervalo de recompra supera 180 dias.", note: after180 != null ? "dos clientes que recompraram" : INSUFFICIENT },
              { tone: "conversion", label: "Conversão 1ª → 2ª", icon: ArrowRightLeft, value: conversionRate, help: conversionHelp(conversion), note: conversionRate != null ? "da coorte observada" : "Dados insuficientes para o período" },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return <article key={kpi.tone} className={styles.repurchaseKpi} data-tone={kpi.tone}>
                <p className={styles.repurchaseKpiLabel}>
                  <span className={styles.repurchaseIcon} aria-hidden="true"><Icon /></span>
                  <span>{kpi.label}<ConceptHelp label={kpi.label} text={kpi.help} /></span>
                </p>
                <p className={styles.repurchaseKpiValue}><AnimatedMetric value={kpi.value} format={percentage} duration={480} active={reveal.seen} /></p>
                <p className={styles.repurchaseInsightNote}>{kpi.note}</p>
                {kpi.tone === "conversion" && conversionDelta != null ? <p className={styles.repurchaseDelta}>{percentagePoints(conversionDelta)}</p> : null}
              </article>;
            })}
          </div>

          <div className={styles.repurchaseMain}>
            <section className={styles.repurchasePanel} aria-label="Distribuição do tempo de recompra">
              <h4 className={styles.repurchaseHeading}>
                Distribuição do tempo de recompra
                <ConceptHelp label="Distribuição do tempo de recompra" text={DISTRIBUTION_HELP} />
              </h4>
              {hasReturns ? (
                <div className={styles.repurchaseBands}>
                  {bands.map((band) => (
                    <HoverTip
                      key={band.label}
                      title={band.label}
                      accent={REPURCHASE_COLORS[band.tone] ?? "hsl(var(--muted-foreground))"}
                      tone={band.tone}
                      dominant={band.dominant}
                      className={styles.repurchaseBand ?? ""}
                      label={
                        band.label +
                        ". " +
                        percentage(band.percentage) +
                        ". " +
                        integer(band.customers) +
                        " compradores."
                      }
                      rows={[
                        ["Participação", percentage(band.percentage)],
                        ["Compradores", integer(band.customers)],
                        ...(band.dominant ? [["Leitura", "Maior faixa"] as [string, string]] : []),
                      ]}
                    >
                      <span className={styles.repurchaseBandRow}>
                        <span className={styles.repurchaseBandName}>
                          {band.label}
                          {band.dominant ? <span className={styles.repurchaseBadge}>Maior faixa</span> : null}
                        </span>
                        <span className={styles.repurchaseTrack}>
                          <AnimatedProgress value={band.percentage} className={styles.repurchaseFill ?? ""} />
                        </span>
                        <span className={styles.repurchaseBandShare}>
                          <AnimatedMetric
                            value={band.percentage}
                            format={percentage}
                            duration={460}
                            active={reveal.seen}
                          />
                        </span>
                      </span>
                    </HoverTip>
                  ))}
                </div>
              ) : (
                <p className={styles.repurchaseEmpty}>{INSUFFICIENT}</p>
              )}
            </section>
            <aside className={styles.repurchaseCallout} style={{ "--accent": dominant ? REPURCHASE_COLORS[dominant.tone] : "var(--tracking-data-charcoal)" } as CSSProperties}>
              <div className={styles.repurchaseCalloutContent}>
              <p className={styles.repurchaseCalloutKicker}><Lightbulb size={16} aria-hidden="true" /> Insight</p>
              {dominant ? <>
                <h4 className={styles.repurchaseCalloutTitle}>{repurchaseConcentration(dominant.label)}</h4>
                <p className={styles.repurchaseCalloutBody}>Essa faixa representa {percentage(dominant.percentage)} dos clientes que recompraram.</p>
              </> : <p className={styles.repurchaseEmpty}>{INSUFFICIENT}</p>}
              </div>
              <div className={styles.repurchaseCalloutArt} aria-hidden="true">
                <img src="/tracking/repurchase/repurchase-cycle.png" width={1024} height={1024} alt="" loading="lazy" decoding="async" draggable={false} />
              </div>
            </aside>
          </div>


        </div>
      </CardContent>
    </Card>
  );
}
function Metric({ label, value, tone, icon: Icon, trend = null, help }: {
  label: string; value: ReactNode; tone: "customers" | "revenue" | "inactivity" | "rate";
  icon: LucideIcon; trend?: Trend | null; help?: string;
}) {
  const TrendIcon = trend?.direction === "up" ? ArrowUp : trend?.direction === "down" ? ArrowDown : Minus;
  const positive = trend?.direction === (tone === "inactivity" ? "down" : "up");
  const sentiment = !trend || trend.direction === "flat" ? "neutral" : positive ? "positive" : "negative";
  return <div className={styles.reactivationMetric} data-tone={tone}>
    <div className={styles.reactivationLabel}><Icon size={14} aria-hidden="true" /><span>{label}</span>{help && <ConceptHelp label={label} text={help} />}</div>
    <p className={styles.reactivationValue}>{value}</p>
    <div className={styles.reactivationComparison}><span data-sentiment={sentiment}>{trend ? <><TrendIcon size={12} aria-hidden="true" />{trend.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{trend.suffix}</> : "—"}</span><span>vs. período anterior</span></div>
  </div>;
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
          {data.ltv.map((item) => (
            <div
              key={item.key}
              className={
                styles.ltvRow +
                " flex items-center justify-between gap-3 rounded-xl px-4 py-4"
              }
              style={
                {
                  "--profile-color": { new: "var(--tracking-data-blue)", existing: "var(--tracking-data-orange)", reactivated: "var(--tracking-data-green)" }[item.key],
                } as React.CSSProperties
              }
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <strong className="whitespace-nowrap text-xl font-semibold tabular-nums text-foreground">
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
              tone="customers" icon={Users} trend={data.overview.trends.reactivatedCustomers}
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
              tone="revenue" icon={BarChart3}
              value={
                <AnimatedMetric value={reactivation.netRevenue} format={money} duration={550} />
              }
            />
            <Metric
              label="Inatividade média"
              tone="inactivity" icon={Repeat}
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
              tone="rate" icon={ArrowRightLeft}
              value={
                <AnimatedMetric
                  value={reactivation.reactivationRate}
                  format={percentage}
                  duration={550}
                />
              }
              help={METRIC_DEFINITIONS.reactivation}
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
