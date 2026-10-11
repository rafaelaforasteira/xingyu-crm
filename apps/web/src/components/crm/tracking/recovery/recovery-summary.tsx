"use client";
import type { CSSProperties } from "react";
import type { RecoveryOverviewData } from "@xingyu/types";
import { ShoppingCart, Wallet, ShoppingBag, Percent, Clock3, Sparkles } from "lucide-react";
import { ConceptHelp } from "../tracking-help";
import { AnimatedMetric } from "../tracking-motion";
import { integer } from "../tracking-format";
import {
  recoveryCompactMoney,
  recoveryMoney,
  recoveryPercent,
  recoveryComparison,
} from "./recovery-format";
import executive from "../tracking-executive.module.css";
import styles from "./recovery.module.css";

export function RecoverySummary({ data }: { data: RecoveryOverviewData }) {
  const a = data.summary,
    b = data.previousSummary;
  const cards = [
    {
      label: "Valor abandonado",
      tone: "orange",
      icon: ShoppingCart,
      value: a.abandonedCents,
      previous: b.abandonedCents,
      format: recoveryCompactMoney,
      help: "Soma dos valores originais dos checkouts elegíveis na coorte de abandono selecionada.",
      positive: false,
    },
    {
      label: "Receita recuperada",
      tone: "green",
      icon: Wallet,
      value: a.recoveredCents,
      previous: b.recoveredCents,
      format: recoveryCompactMoney,
      help: "Valor líquido dos pedidos pagos vinculados com evidência. Já integra as vendas; não é receita adicional.",
      positive: true,
    },
    {
      label: "Carrinhos recuperados",
      tone: "blue",
      icon: ShoppingBag,
      value: a.recoveredCases,
      previous: b.recoveredCases,
      format: integer,
      help: "Checkouts com um pedido pago associado dentro da janela. Um pedido recupera no máximo um caso.",
      positive: true,
    },
    {
      label: "Taxa de recuperação",
      tone: "green",
      icon: Percent,
      value: a.recoveryRate,
      previous: a.openCases || b.openCases ? null : b.recoveryRate,
      format: recoveryPercent,
      help: "Recuperados ÷ (recuperados + expirados). Em aberto não entra no denominador. Taxa indisponível sob filtros de status ou método para evitar seleção pelo resultado.",
      positive: true,
      points: true,
    },
    {
      label: "Em recuperação",
      tone: "yellow",
      icon: Clock3,
      value: a.openCents,
      previous: b.openCents,
      format: recoveryCompactMoney,
      help: "Valor dos carrinhos ainda em aberto dentro da janela. Não representa receita garantida.",
      positive: false,
    },
    {
      label: "Receita estimada",
      tone: "purple",
      icon: Sparkles,
      value: a.expectedRecoverableCents,
      previous: b.expectedRecoverableCents,
      format: recoveryCompactMoney,
      help: "Soma de valor aberto × probabilidade calibrada. Indisponível até o modelo estar validado e pronto.",
      positive: true,
    },
  ];
  return (
    <section aria-labelledby="recovery-summary-title">
      <div className={executive.sectionHead}>
        <h2 id="recovery-summary-title" className={executive.sectionTitle}>
          Resumo do período
        </h2>
        <p className={executive.sectionText}>
          Abandono, recuperação e valor ainda dentro da janela.
        </p>
      </div>
      <div className={styles.kpiGrid}>
        {cards.map((c, index) => {
          const Icon = c.icon,
            delta = recoveryComparison(c.value, c.previous, c.points);
          const favorable =
            delta != null && ((delta > 0 && c.positive) || (delta < 0 && !c.positive));
          return (
            <article
              key={c.label}
              className={executive.kpi + " " + styles.kpi}
              data-tone={c.tone}
              style={{ "--delay": `${index * 45}ms` } as CSSProperties}
            >
              <div className={executive.kpiContent}>
                <div className={executive.kpiHead}>
                  <span className={styles.metricIcon}>
                    <Icon size={18} />
                  </span>
                  <span className={executive.labelGroup}>
                    <span className={executive.label}>{c.label}</span>
                    <ConceptHelp label={c.label} text={c.help} />
                  </span>
                </div>
                <p className={executive.value + " " + styles.kpiValue}>
                  <AnimatedMetric value={c.value} format={c.format} />
                </p>
                <div className={styles.comparison}>
                  <span
                    data-meaning={delta == null ? "neutral" : favorable ? "positive" : "attention"}
                  >
                    {delta == null
                      ? "—"
                      : `${delta > 0 ? "+" : ""}${delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${c.points ? " p.p." : "%"}`}
                  </span>
                  <small>vs. período anterior</small>
                </div>
                {c.label === "Receita estimada" && c.value == null && (
                  <small className={styles.note}>Modelo em aprendizado</small>
                )}
                <span className="sr-only">
                  Valor completo:{" "}
                  {c.format === recoveryCompactMoney ? recoveryMoney(c.value) : c.format(c.value)}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      <p className={styles.note}>
        {a.matureCases} carrinhos maduros · {a.openCases} ainda em aberto · janela de{" "}
        {data.attributionDays} dias. Taxa considera apenas resultados observáveis.
        {a.openCases > 0 &&
          " Comparações de volume e receita são parciais; comparação da taxa aguarda maturidade das coortes."}
      </p>
    </section>
  );
}
