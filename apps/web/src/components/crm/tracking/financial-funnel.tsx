"use client";
import { useId, useState } from "react";
import { Info } from "lucide-react";
import type { FinancialFlowData } from "./sales-tracking-types";
import { money, percentage, SalesTrend } from "./sales-overview-format";
import styles from "./financial-funnel.module.css";

export function FinancialFunnel({ flow, isMock }: { flow: FinancialFlowData; isMock: boolean }) {
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const id = useId();
  const clipId = `funnel-${id.replace(/:/g, "")}`;
  const hasRecovery = (flow.recoverableAmount ?? 0) > 0 || (flow.recoveredAmount ?? 0) > 0;
  const rate = (value: number | null) =>
    value != null && Number.isFinite(value) ? percentage(value) : "—";
  if (!Number.isFinite(flow.grossSales) || flow.grossSales <= 0)
    return (
      <div className="flex min-h-72 items-center justify-center rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        Nenhuma venda encontrada neste período.
      </div>
    );
  const stages = [
    { label: "Vendas brutas", value: money(flow.grossSales), tone: "gross", y: 10.5 },
    {
      label: "Cancelamentos",
      value: `− ${money(flow.cancellations)}`,
      tone: "loss",
      y: 28,
      percent: rate(flow.cancellationsRate),
    },
    {
      label: "Reembolsos",
      value: `− ${money(flow.refunds)}`,
      tone: "refund",
      y: 44,
      percent: rate(flow.refundsRate),
    },
    {
      label: "Vendas líquidas",
      value: money(flow.netSales),
      tone: "net",
      y: 61,
      percent: rate(flow.realizationRate),
    },
  ];
  return (
    <div className={styles.funnel}>
      <p className="sr-only">
        Fluxo financeiro. Formato esquemático: as larguras não representam os valores. Percentuais
        em relação às vendas brutas.
      </p>
      <div className={styles.diagram}>
        <svg
          viewBox="0 0 500 520"
          preserveAspectRatio="none"
          aria-hidden="true"
          className={styles.shape}
        >
          <defs>
            <clipPath id={clipId}>
              <path d="M 20 4 H 408 Q 423 4 417 19 L 223 503 Q 214 524 205 503 L 11 19 Q 5 4 20 4 Z" />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <path className={styles.gross} fill="var(--fill)" d="M0 0H430V105H0Z" />
            <path className={styles.loss} fill="var(--fill)" d="M0 105H430V187H0Z" />
            <path className={styles.refund} fill="var(--fill)" d="M0 187H430V269H0Z" />
            <path className={styles.net} fill="var(--fill)" d="M0 269H430V520H0Z" />
            {[105, 187, 269].map((y) => (
              <path key={y} d={`M0 ${y}H430`} stroke="white" strokeWidth="4" />
            ))}
          </g>
        </svg>
        {stages.map((stage) => (
          <div key={stage.tone}>
            <div className={`${styles.stage} ${styles[stage.tone]}`} style={{ top: `${stage.y}%` }}>
              <div className={styles.label}>
                {stage.label}
                {stage.tone === "loss" && hasRecovery && (
                  <button
                    type="button"
                    className={styles.info}
                    aria-label="Detalhes de recuperação"
                    aria-expanded={recoveryOpen}
                    aria-controls={id}
                    onClick={() => setRecoveryOpen(!recoveryOpen)}
                  >
                    <Info size={14} aria-hidden />
                  </button>
                )}
              </div>
              <p className={styles.value}>{stage.value}</p>
            </div>
            {stage.percent && (
              <div
                className={`${styles.badge} ${styles[stage.tone]}`}
                style={{ top: `${stage.y}%` }}
                aria-label={`${stage.label}: ${stage.percent} das vendas brutas`}
              >
                <span>{stage.percent}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className={styles.trend}>
        <SalesTrend trend={flow.trends.netSales} />
      </div>
      {hasRecovery && (
        <div
          id={id}
          hidden={!recoveryOpen}
          className="mt-3 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground"
        >
          <p className="mb-2 font-medium text-foreground">
            Recuperação das perdas{isMock ? " · Simulação" : ""}
          </p>
          {(flow.recoverableAmount ?? 0) > 0 && (
            <p>
              Em recuperação: <strong>{money(flow.recoverableAmount!)}</strong>
            </p>
          )}
          {(flow.recoveredAmount ?? 0) > 0 && (
            <p>
              Recuperado: <strong className="text-success">{money(flow.recoveredAmount!)}</strong>
            </p>
          )}
          <p className="mt-2">
            Pode incluir cancelamentos e outras perdas. Valores em recuperação não compõem as vendas
            líquidas.
          </p>
        </div>
      )}
    </div>
  );
}
