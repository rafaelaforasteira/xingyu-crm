"use client";
import type { ReactNode } from "react";
import type { RecoveryOverviewData } from "@xingyu/types";
import { ArrowDown, ArrowUp, Minus, ShoppingCart, Wallet, Percent, Clock3 } from "lucide-react";
import { AIIcon } from "@/components/ui/ai-icon";
import { ExecutiveKpi } from "../tracking-executive-summary";
import {
  recoveryCompactMoney,
  recoveryPercent,
  recoveryComparison,
} from "./recovery-format";
import executive from "../tracking-executive.module.css";
import visual from "./recovery-kpi.module.css";

export function RecoverySummary({ data, meta }: { data: RecoveryOverviewData; meta?: ReactNode }) {
  const a = data.summary,
    b = data.previousSummary;
  // Assets retain their original transparency; layout and interactions are shared with Overview.
  const cards = [
    {
      label: "Valor abandonado",
      accent: "ticket" as const,
      artwork: "/tracking/recovery/kpi-abandoned-value-gold.png",
      className: visual.gold,
      icon: ShoppingCart,
      value: a.abandonedCents,
      previous: b.abandonedCents,
      format: recoveryCompactMoney,
      help: "Soma dos valores originais dos checkouts elegíveis na coorte de abandono selecionada.",
      positive: false,
    },
    {
      label: "Em recuperação",
      accent: "repeat" as const,
      artwork: "/tracking/recovery/kpi-recovery-progress-copper.png",
      className: visual.copper,
      icon: Clock3,
      value: a.openCents,
      previous: b.openCents,
      format: recoveryCompactMoney,
      help: "Valor dos carrinhos ainda em aberto dentro da janela. Não representa receita garantida.",
      positive: false,
    },
    {
      label: "Receita recuperada",
      accent: "net" as const,
      artwork: "/tracking/recovery/kpi-recovered-revenue-emerald.png",
      className: visual.emerald,
      icon: Wallet,
      value: a.recoveredCents,
      previous: b.recoveredCents,
      format: recoveryCompactMoney,
      help: "Valor líquido dos pedidos pagos vinculados com evidência. Já integra as vendas; não é receita adicional.",
      positive: true,
    },
    {
      label: "Taxa de recuperação",
      accent: "net" as const,
      artwork: "/tracking/recovery/kpi-recovery-rate-cyan.png",
      className: visual.cyan,
      icon: Percent,
      value: a.recoveryRate,
      previous: a.openCases || b.openCases ? null : b.recoveryRate,
      format: recoveryPercent,
      help: "Recuperados ÷ (recuperados + expirados). Em aberto não entra no denominador. Taxa indisponível sob filtros de status ou método para evitar seleção pelo resultado.",
      positive: true,
      points: true,
    },
    {
      label: "Receita estimada",
      accent: "estimate" as const,
      artwork: "/brand/brainx-mark.png",
      className: visual.violet,
      icon: AIIcon,
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
        <div className={executive.summaryMetaRow}>
          <p className={executive.sectionText}>
            Abandono, recuperação e valor ainda dentro da janela.
          </p>
          {meta}
        </div>
      </div>
      <div className={executive.kpiGrid}>
        {cards.map((c, index) => {
          const delta = recoveryComparison(c.value, c.previous, c.points);
          const favorable = delta != null && ((delta > 0 && c.positive) || (delta < 0 && !c.positive));
          const Direction = delta == null || delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
          return (
            <ExecutiveKpi
              key={c.label}
              {...c}
              index={index}
              trend={null}
              infoAtEnd
              auxiliary={c.label === "Receita estimada" && c.value == null ? "Modelo em aprendizado" : undefined}
              comparison={
                <>
                  <span className={executive.chip} data-sentiment={delta == null ? "unavailable" : favorable ? "positive" : "negative"}>
                    {delta != null && <Direction size={12} aria-hidden="true" />}
                    {delta == null ? "—" : (delta > 0 ? "+" : "") + delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + (c.points ? " p.p." : "%")}
                  </span>
                  <span className={executive.compareLabel}>vs. período anterior</span>
                </>
              }
            />
          );
        })}
      </div>
    </section>
  );
}
