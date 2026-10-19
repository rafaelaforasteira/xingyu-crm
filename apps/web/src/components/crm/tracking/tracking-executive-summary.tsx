"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Minus,
  Receipt,
  Repeat2,
  ShoppingBag,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ConceptHelp } from "./tracking-help";
import { AnimatedMetric } from "./tracking-motion";
import { METRIC_DEFINITIONS } from "./tracking-dictionary";
import { formatFunnelMoney } from "./financial-funnel-format";
import { integer, money } from "./tracking-format";
import type { SalesTrackingData, Trend } from "./sales-tracking-types";
import styles from "./tracking-executive.module.css";

const TICKET_HELP = "Vendas líquidas do período divididas pelos pedidos pagos.";

type KpiAccent = "net" | "orders" | "buyers" | "ticket" | "repeat" | "estimate";

const KPI_ART: Record<KpiAccent, string> = {
  net: "/tracking/kpi-art/net-sales.png",
  orders: "/tracking/kpi-art/paid-orders.png",
  buyers: "/tracking/kpi-art/buyers.png",
  ticket: "/tracking/kpi-art/average-order-value.png",
  repeat: "/tracking/kpi-art/repeat-revenue.png",
  estimate: "/tracking/kpi-art/buyers.png",
};

export function TrackingExecutiveSummary({
  data,
  meta,
}: {
  data: SalesTrackingData;
  meta?: ReactNode;
}) {
  const overview = data.overview;
  const cards: Array<{
    key: string;
    accent: KpiAccent;
    icon: LucideIcon;
    label: string;
    value: number | null;
    format: (value: number | null) => string;
    help: string;
    trend: Trend | null;
  }> = [
    {
      key: "net",
      accent: "net",
      icon: Wallet,
      label: "Vendas líquidas",
      value: overview.netSales,
      format: formatFunnelMoney,
      help: METRIC_DEFINITIONS.netSales,
      trend: overview.trends.netSales,
    },
    {
      key: "orders",
      accent: "orders",
      icon: ShoppingBag,
      label: "Pedidos pagos",
      value: overview.paidOrders,
      format: integer,
      help: METRIC_DEFINITIONS.paidOrders,
      trend: overview.trends.paidOrders,
    },
    {
      key: "buyers",
      accent: "buyers",
      icon: UsersRound,
      label: "Compradores",
      value: overview.buyers,
      format: integer,
      help: METRIC_DEFINITIONS.buyers,
      trend: overview.trends.buyers,
    },
    {
      key: "ticket",
      accent: "ticket",
      icon: Receipt,
      label: "Valor médio por compra",
      value: overview.averageTicket,
      format: money,
      help: TICKET_HELP,
      trend: overview.trends.averageTicket,
    },
    {
      key: "repeat",
      accent: "repeat",
      icon: Repeat2,
      label: "Receita de recompra",
      value: overview.repeatRevenue,
      format: formatFunnelMoney,
      help: METRIC_DEFINITIONS.repeatRevenue,
      trend: overview.trends.repeatRevenue,
    },
  ];
  return (
    <section aria-labelledby="tracking-executive-summary-title">
      <header className={styles.sectionHead}>
        <h2 id="tracking-executive-summary-title" className={styles.sectionTitle}>
          Resumo do período
        </h2>
        <div className={styles.summaryMetaRow}>
          <p className={styles.sectionText}>Os principais números do período selecionado.</p>
          {meta}
        </div>
      </header>
      <div className={styles.kpiGrid}>
        {cards.map(({ key, ...card }, index) => (
          <ExecutiveKpi key={key} {...card} index={index} />
        ))}
      </div>
    </section>
  );
}

export function ExecutiveKpi({
  accent,
  icon: Icon,
  label,
  value,
  format,
  help,
  trend,
  index,
  artwork,
  comparison,
  auxiliary,
  infoAtEnd = false,
  className,
}: {
  accent: KpiAccent;
  icon: LucideIcon;
  label: string;
  value: number | null;
  format: (value: number | null) => string;
  help: string;
  trend: Trend | null;
  index: number;
  artwork?: string;
  comparison?: ReactNode;
  auxiliary?: ReactNode;
  infoAtEnd?: boolean;
  className?: string;
}) {
  return (
    <article
      className={[styles.kpi, className].filter(Boolean).join(" ")}
      data-accent={accent}
      style={{ "--delay": `${index * 45}ms` } as CSSProperties}
    >
      <img
        className={styles.artwork}
        src={artwork ?? KPI_ART[accent]}
        alt=""
        aria-hidden="true"
        width={112}
        height={112}
        decoding="async"
      />
      <div className={styles.kpiContent}>
        <div className={styles.kpiHead}>
          <span className={styles.icon}>
            <Icon size={15} aria-hidden="true" />
          </span>
          <span className={styles.labelGroup + (infoAtEnd ? " " + styles.labelWithEndInfo : "")}>
            <span className={styles.label}>{label}</span>
            <ConceptHelp
              label={label}
              text={help}
              className={
                styles.info +
                " inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              }
            />
          </span>
        </div>
        <p className={styles.value}>
          <AnimatedMetric value={value} format={format} duration={650} />
        </p>
        <div className={styles.compare}>
          {comparison ?? (trend ? <Comparison trend={trend} /> : <UnavailableComparison />)}
          {auxiliary && <span className={styles.compareLabel}>{auxiliary}</span>}
        </div>
      </div>
    </article>
  );
}

function Comparison({ trend }: { trend: Trend }) {
  const Icon = trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;
  const amount = `${trend.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${trend.suffix === "dias" ? " dias" : "%"}`;
  const meaning =
    trend.direction === "up" ? "Aumento" : trend.direction === "down" ? "Redução" : "Sem variação";
  return (
    <>
      <span className={styles.chip} data-sentiment={trend.sentiment} aria-label={`${meaning} de ${amount} em relação ao período anterior`}>
        <Icon size={12} aria-hidden="true" />
        {amount}
      </span>
      <span className={styles.compareLabel}>vs. período anterior</span>
    </>
  );
}

function UnavailableComparison() {
  return (
    <>
      <span className={styles.chip} data-sentiment="unavailable" aria-label="Comparação com o período anterior indisponível">
        —
      </span>
      <span className={styles.compareLabel}>vs. período anterior</span>
    </>
  );
}
