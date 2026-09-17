"use client";
import type { CSSProperties, ReactNode } from "react";
import { AnimatedMetric, useTrackingMotion } from "./tracking-motion";
import type { FinancialFlowData } from "./sales-tracking-types";
import { money, percentage } from "./tracking-format";
import {
  formatFunnelMoney,
  percentagePoints,
  realizationComparison,
} from "./financial-funnel-format";
import { FunnelTooltipScope, FunnelTooltipTrigger } from "./financial-funnel-tooltip";
import styles from "./financial-funnel.module.css";

type Stage = {
  label: string;
  value: number;
  tone: "gross" | "loss" | "refund" | "net";
  detail: string;
  balance?: number;
};

// Each transition lives inside its next stage: one layout source for both.
const STAGE_LAYOUT: Record<Stage["tone"], CSSProperties & Record<string, string>> = {
  gross: { "--stage-offset": "0cqw", "--stage-width": "66cqw" },
  loss: { "--stage-offset": "4.6cqw", "--stage-width": "56.8cqw" },
  refund: { "--stage-offset": "9.2cqw", "--stage-width": "47.6cqw" },
  net: { "--stage-offset": "13.8cqw", "--stage-width": "38.4cqw" },
};

export function FinancialFunnel({ flow }: { flow: FinancialFlowData }) {
  const { revision, initial } = useTrackingMotion();
  const comparison = realizationComparison(flow);
  if (!Number.isFinite(flow.grossSales) || flow.grossSales <= 0) {
    return (
      <div className="flex min-h-72 items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Nenhuma venda encontrada neste período.
      </div>
    );
  }
  const stages: Stage[] = [
    {
      label: "Vendas brutas",
      value: flow.grossSales,
      tone: "gross",
      detail: "100% do valor bruto gerado",
    },
    {
      label: "Cancelamentos",
      value: -flow.cancellations,
      tone: "loss",
      detail: percentage(flow.cancellationsRate) + " das vendas brutas",
      balance: flow.afterCancellations,
    },
    {
      label: "Reembolsos",
      value: -flow.refunds,
      tone: "refund",
      detail: percentage(flow.refundsRate) + " das vendas brutas",
      balance: flow.afterRefunds,
    },
    {
      label: "Vendas líquidas",
      value: flow.netSales,
      tone: "net",
      detail: percentage(flow.realizationRate) + " das vendas brutas",
    },
  ];
  const rates: Partial<Record<Stage["tone"], ReactNode>> = {
    loss: (
      <FunnelTransitionRate
        delay={180}
        value={flow.grossToAfterCancellationRate}
        label="Mantido após cancelamentos"
        help={
          <RateDetail
            label="Mantido após cancelamentos"
            value={flow.grossToAfterCancellationRate}
            detail={`${money(flow.afterCancellations)} mantidos de ${money(flow.grossSales)} em vendas brutas.`}
          />
        }
      />
    ),
    refund: (
      <FunnelTransitionRate
        delay={270}
        value={flow.afterCancellationToAfterRefundRate}
        label="Mantido após reembolsos"
        help={
          <RateDetail
            label="Mantido após reembolsos"
            value={flow.afterCancellationToAfterRefundRate}
            detail={`${money(flow.afterRefunds)} mantidos de ${money(flow.afterCancellations)} após cancelamentos.`}
          />
        }
      />
    ),
    net: (
      <FunnelTransitionRate
        delay={360}
        value={flow.realizationRate}
        label="Taxa de realização"
        help={
          <>
            <RateDetail
              label="Taxa de realização"
              value={flow.realizationRate}
              detail={`${money(flow.netSales)} líquidos sobre ${money(flow.grossSales)} brutos.`}
            />
            <span className="mt-3 block border-t border-border/60 pt-2">
              <strong className="text-primary">{percentagePoints(comparison.delta)}</strong>
              {comparison.previousRate != null && (
                <span className="mt-1 block text-muted-foreground">
                  vs. {percentage(comparison.previousRate)} no período anterior. Comparação em
                  pontos percentuais.
                </span>
              )}
            </span>
          </>
        }
      />
    ),
  };
  return (
    <FunnelTooltipScope className={styles.funnel} revision={revision}>
      <p className="sr-only">
        Funil financeiro. As larguras são esquemáticas. Foque ou toque em cada etapa para consultar
        valores exatos.
      </p>
      <div className={styles.diagram + (initial ? "" : " " + styles.updated)}>
        {stages.map((stage, index) => (
          <div
            key={stage.tone}
            className={styles.stageSlot}
            style={STAGE_LAYOUT[stage.tone]}
            data-funnel-stage={stage.tone}
          >
            <FunnelStage stage={stage} index={index} revision={revision} />
            {rates[stage.tone] && <div className={styles.rateAnchor}>{rates[stage.tone]}</div>}
          </div>
        ))}
      </div>
    </FunnelTooltipScope>
  );
}

function FunnelStage({
  stage,
  index,
  revision,
}: {
  stage: Stage;
  index: number;
  revision: number;
}) {
  return (
    <FunnelTooltipTrigger
      tone={stage.tone}
      label={stage.label}
      className={`${styles.stage} ${styles[stage.tone]}`}
      style={{ "--delay": `${index * 80}ms` } as CSSProperties}
      text={
        <>
          <strong className="block text-[11px] font-semibold uppercase tracking-wide">
            {stage.label}
          </strong>
          <strong className={styles.tooltipMetric}>{money(stage.value)}</strong>
          <span className="mt-1 block text-muted-foreground">{stage.detail}</span>
          {stage.balance != null && (
            <span className="mt-2 block rounded-lg bg-muted/50 p-2 text-muted-foreground">
              Valor mantido:{" "}
              <strong className="block font-semibold text-foreground tabular-nums">
                {money(stage.balance)}
              </strong>
            </span>
          )}
        </>
      }
    >
      <svg
        key={revision}
        className={styles.shape}
        viewBox="0 0 400 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M 10 2 H 390 Q 398 2 395 10 L 367 91 Q 365 98 357 98 H 43 Q 35 98 33 91 L 5 10 Q 2 2 10 2 Z" />
      </svg>
      <span className={styles.stageContent}>
        <span className={styles.label}>{stage.label}</span>
        <span className={styles.value}>
          <AnimatedMetric value={stage.value} format={formatFunnelMoney} duration={650} />
        </span>
      </span>
    </FunnelTooltipTrigger>
  );
}

function FunnelTransitionRate({
  delay,
  value,
  label,
  help,
}: {
  delay: number;
  value: number | null;
  label: string;
  help: ReactNode;
}) {
  return (
    <div className={styles.transition} style={{ "--delay": `${delay}ms` } as CSSProperties}>
      <FunnelTooltipTrigger
        label={`${percentage(value)} — ${label}`}
        className={styles.rateTrigger}
        text={help}
      >
        <span className={styles.rateValue}>
          <AnimatedMetric value={value} format={percentage} duration={650} />
        </span>
      </FunnelTooltipTrigger>
    </div>
  );
}

function RateDetail({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | null;
  detail: string;
}) {
  return (
    <>
      <strong className="block text-[11px] font-semibold uppercase tracking-wide">{label}</strong>
      <strong className={styles.tooltipMetric}>{percentage(value)}</strong>
      <span className="mt-1 block text-muted-foreground">{detail}</span>
    </>
  );
}
