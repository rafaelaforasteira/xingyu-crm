"use client";
import type { CSSProperties, ReactNode } from "react";
import type { SalesTrackingData } from "./sales-tracking-types";
import {
  Wallet,
  Repeat2,
  Clock3,
  UserRoundCheck,
  ShoppingBag,
  UsersRound,
  Receipt,
  Info,
  ArrowUp,
  ArrowDown,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { AnimatedMetric, useTrackingMotion } from "./tracking-motion";
import { FunnelTooltipScope, FunnelTooltipTrigger } from "./financial-funnel-tooltip";
import { money, days, integer, percentage } from "./tracking-format";
import { REACTIVATION_DAYS } from "./sales-tracking-rules";
import type { IntelligenceTrend } from "./sales-intelligence-mock";
import { salesIntelligenceModel } from "./sales-intelligence-model";
import styles from "./sales-intelligence.module.css";

export function SalesIntelligence({ data }: { data: SalesTrackingData }) {
  const { revision } = useTrackingMotion();
  const model = salesIntelligenceModel(data);
  const reactivation = model.reactivation;
  const cards = [
    {
      key: "ltv",
      icon: Wallet,
      label: "LTV médio",
      value: model.averageLtv,
      format: money,
      detail: "dos compradores do período",
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
          : "dos elegíveis voltaram a comprar",
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
      detail: "entre compras válidas",
      trend: model.trends.averageRepurchaseDays,
      help: "Intervalo médio entre compras válidas dos clientes que realizaram pelo menos uma recompra.",
    },
    {
      key: "reactivation",
      icon: UserRoundCheck,
      label: "Clientes reativados",
      value: reactivation.reactivatedCustomers,
      format: integer,
      detail:
        reactivation.reactivationRate == null ? (
          "Base elegível indisponível"
        ) : (
          <>
            <span className="font-semibold text-success">
              {percentage(reactivation.reactivationRate)}
            </span>{" "}
            dos elegíveis
          </>
        ),
      trend: model.trends.reactivatedCustomers,
      help: `${model.isDemonstrative ? "Comparativo demonstrativo de +11,4%. " : ""}Clientes que voltaram a comprar após ${REACTIVATION_DAYS} dias ou mais sem uma compra válida. ${reactivation.eligibleCustomers == null ? "Base elegível indisponível neste recorte." : `${integer(reactivation.reactivatedCustomers)} de ${integer(reactivation.eligibleCustomers)} clientes elegíveis voltaram no período. Taxa de reativação: ${percentage(reactivation.reactivationRate)}.`}`,
    },
  ];
  return (
    <FunnelTooltipScope className={styles.panel} revision={revision}>
      <section aria-label="Inteligência comercial">
        <div className={styles.primaryGrid}>
          {cards.map(({ key, ...card }, index) => (
            <IntelligenceMetric key={key} {...card} tone={key} index={index} />
          ))}
        </div>
        <div className={styles.secondaryGrid}>
          {[
            { icon: ShoppingBag, label: "Pedidos pagos", value: model.paidOrders, format: integer },
            { icon: UsersRound, label: "Compradores", value: model.buyers, format: integer },
            { icon: Receipt, label: "Ticket médio", value: model.averageTicket, format: money },
          ].map((metric) => (
            <div key={metric.label} className={styles.secondary}>
              <p className={styles.secondaryLabel}>
                <metric.icon size={14} aria-hidden="true" />
                {metric.label}
              </p>
              <p className={styles.secondaryValue}>
                <AnimatedMetric value={metric.value} format={metric.format} duration={450} />
              </p>
            </div>
          ))}
        </div>
      </section>
    </FunnelTooltipScope>
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
  detail: ReactNode;
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
      <div
        className={styles.trend}
        data-sentiment={trend?.sentiment ?? "neutral"}
        aria-label={
          trend
            ? `${trend.direction === "up" ? "Aumento" : trend.direction === "down" ? "Redução" : "Sem variação"} de ${trend.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${trend.suffix === "dias" ? " dias" : trend.suffix === "p.p." ? " p.p." : "%"} em relação ao período anterior`
            : "Sem comparativo anterior"
        }
      >
        {trend ? (
          <>
            <TrendIcon trend={trend} />
            {trend.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            {trend.suffix === "dias" ? " dias" : trend.suffix === "p.p." ? " p.p." : "%"}
          </>
        ) : (
          "—"
        )}
      </div>
      <div className={styles.header}>
        <Icon className={styles.metricIcon} size={17} aria-hidden="true" />
        <p className={styles.title}>{label}</p>
        <FunnelTooltipTrigger
          label={label}
          className={styles.info}
          text={
            <>
              <strong className="mb-2 block font-semibold text-primary">{label}</strong>
              <span className="block">{help}</span>
              <span className="mt-2 block text-muted-foreground">{detail}</span>
              <span className="mt-2 block text-muted-foreground">
                {trend
                  ? "A tag compara com o período anterior."
                  : "Sem comparativo anterior disponível."}
              </span>
            </>
          }
        >
          <Info size={13} aria-hidden="true" />
        </FunnelTooltipTrigger>
      </div>
      <p className={styles.value}>
        <AnimatedMetric value={value} format={format} duration={650} />
      </p>
    </div>
  );
}

function TrendIcon({ trend }: { trend: IntelligenceTrend }) {
  const Icon = trend.direction === "up" ? ArrowUp : trend.direction === "down" ? ArrowDown : Minus;
  return <Icon size={12} aria-hidden="true" />;
}
