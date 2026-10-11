"use client";
import type { CSSProperties } from "react";
import type { SalesTrackingData } from "./sales-tracking-types";
import {
  Wallet,
  Repeat2,
  Clock3,
  UserRoundCheck,
  ArrowUp,
  ArrowDown,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { AnimatedMetric } from "./tracking-motion";
import { ConceptHelp } from "./tracking-help";
import { money, days, integer, percentage } from "./tracking-format";
import { REACTIVATION_DAYS } from "./sales-tracking-rules";
import type { IntelligenceTrend } from "./sales-intelligence-mock";
import { salesIntelligenceModel } from "./sales-intelligence-model";
import styles from "./sales-intelligence.module.css";

export function SalesIntelligence({ data }: { data: SalesTrackingData }) {
  const model = salesIntelligenceModel(data);
  const reactivation = model.reactivation;
  const cards = [
    {
      key: "ltv",
      icon: Wallet,
      label: "LTV médio",
      value: model.averageLtv,
      format: money,
      detail: "Valor histórico médio por comprador",
      trend: model.trends.averageLtv,
      help: "Valor líquido histórico acumulado pelos compradores selecionados até a data final da análise.",
    },
    {
      key: "retention",
      icon: Repeat2,
      label: "Taxa de recompra",
      value: model.repeatCustomerRate.rate,
      format: percentage,
      detail:
        model.repeatCustomerRate.rate == null
          ? "Coorte ainda não disponível"
          : "Clientes elegíveis que voltaram a comprar",
      trend: model.trends.repeatCustomerRate,
      help: model.isDemonstrative
        ? "Coorte demonstrativa: 96 de 250 clientes elegíveis voltaram a comprar em uma janela de 60 dias (38,4%). Variação ilustrativa de +4,2 pontos percentuais. Não equivale à participação da receita de recompra."
        : "Percentual dos clientes elegíveis que realizaram uma nova compra dentro da janela de observação definida. Coorte ainda não disponível.",
    },
    {
      key: "time",
      icon: Clock3,
      label: "Tempo médio até recompra",
      value: model.averageRepurchaseDays,
      format: days,
      detail: "Intervalo médio entre compras válidas",
      trend: model.trends.averageRepurchaseDays,
      help: "Intervalo médio entre compras válidas dos clientes que realizaram pelo menos uma recompra.",
    },
    {
      key: "reactivation",
      icon: UserRoundCheck,
      label: "Clientes reativados",
      value: reactivation.reactivatedCustomers,
      format: integer,
      detail: "Clientes que retornaram após inatividade",
      trend: model.trends.reactivatedCustomers,
      help: `${model.isDemonstrative ? "Comparativo demonstrativo de +11,4%. " : ""}Clientes que voltaram a comprar após ${REACTIVATION_DAYS} dias ou mais sem uma compra válida. ${reactivation.eligibleCustomers == null ? "Base elegível indisponível neste recorte." : `${integer(reactivation.reactivatedCustomers)} de ${integer(reactivation.eligibleCustomers)} clientes elegíveis voltaram no período. Taxa de reativação: ${percentage(reactivation.reactivationRate)}.`}`,
    },
  ];
  return (
    <section className={styles.panel} aria-label="Inteligência comercial">
      <div className={styles.primaryGrid}>
        {cards.map(({ key, ...card }, index) => (
          <IntelligenceMetric key={key} {...card} tone={key} index={index} />
        ))}
      </div>
    </section>
  );
}
function IntelligenceMetric({
  label,
  icon: Icon,
  value,
  format,
  detail,
  help,
  trend,
  tone,
  index,
}: {
  label: string;
  icon: LucideIcon;
  value: number | null;
  format: (value: number | null) => string;
  detail: string;
  help: string;
  trend: IntelligenceTrend | null;
  tone: string;
  index: number;
}) {
  return (
    <div
      className={styles.metric}
      data-tone={tone}
      style={{ "--delay": `${index * 50}ms` } as CSSProperties}
    >
      <div className={styles.header}>
        <span className={styles.metricIcon}>
          <Icon size={15} aria-hidden="true" />
        </span>
        <span className={styles.title}>{label}</span>
        <ConceptHelp
          label={label}
          className={
            styles.info +
            " inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          }
          text={
            <>
              <strong className="mb-1 block text-[13px] font-semibold leading-snug">{label}</strong>
              <span className="block text-muted-foreground">{help}</span>
            </>
          }
        />
      </div>
      <div className={styles.body}>
        <p className={styles.value}>
          <AnimatedMetric value={value} format={format} duration={650} />
        </p>
        <p className={styles.detail}>{detail}</p>
      </div>
      <div className={styles.trendRow}>
        <span className={styles.trend} data-sentiment={trend?.sentiment ?? "neutral"}>
          {trend ? (
            <>
              <TrendIcon trend={trend} />
              {trend.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              {trend.suffix === "dias" ? " dias" : trend.suffix === "p.p." ? " p.p." : "%"}
            </>
          ) : (
            "—"
          )}
        </span>
        <span className={styles.trendCaption}>vs. período anterior</span>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: IntelligenceTrend }) {
  const Icon = trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;
  return <Icon size={12} aria-hidden="true" />;
}
