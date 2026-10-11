"use client";
import type { RecoveryOverviewData } from "@xingyu/types";
import { ShieldCheck } from "lucide-react";
import { ConceptHelp } from "../tracking-help";
import { recoveryPercent } from "./recovery-format";
import styles from "./recovery.module.css";
export function RecoveryDataQuality({ data }: { data: RecoveryOverviewData }) {
  const q = data.dataQuality;
  const diagnostics = [
    ["Checkouts duplicados", q.duplicatedCheckouts],
    ["Pedidos duplicados", q.duplicatedOrders],
    ["Casos inválidos excluídos", q.invalidCases],
    ["Valores ausentes", q.missingValues],
    ["Clientes não identificados", q.unknownCustomers],
    ["Origem ausente", q.missingSource],
    ["Matching ambíguo", q.ambiguousCases],
    ["Pedidos pagos sem match", q.unmatchedOrders],
    ["Evidência de método conflitante", q.conflictingAttribution],
    ["Casos excluídos do ML", q.excludedMlCases],
    ["Casos em outra moeda", q.excludedCurrencyCases],
  ] as const;
  const reconciles = Object.values(q.reconciliation).every(Boolean);
  return (
    <section
      className={styles.card + " " + styles.quality}
      aria-labelledby="recovery-quality-title"
    >
      <div className={styles.sectionHead}>
        <div>
          <h2 id="recovery-quality-title">
            <ShieldCheck size={16} /> Qualidade dos dados
          </h2>
          <p>Diagnósticos do histórico normalizado da organização; cobertura do recorte atual.</p>
        </div>
        <ConceptHelp
          label="Qualidade e reconciliação"
          text="Casos inválidos e duplicados são tratados antes das coortes. Pedidos sem match não são inventados como recuperados. Diagnósticos abrangem o histórico carregado; os totais selecionados reconciliam por status, método, receita, tempo e pedido único."
        />
      </div>
      <div className={styles.qualityHeader}>
        <strong>{reconciles ? "Totais reconciliados" : "Há divergência nos totais"}</strong>
        <span>Cobertura de método: {recoveryPercent(data.attributionCoverage.revenuePercent)}</span>
      </div>
      <dl className={styles.qualityGrid}>
        {diagnostics
          .filter(([label]) =>
            [
              "Matching ambíguo",
              "Origem ausente",
              "Casos excluídos do ML",
              "Evidência de método conflitante",
            ].includes(label),
          )
          .map(([label, count]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{count}</dd>
            </div>
          ))}
      </dl>
      <details className={styles.details}>
        <summary>Todos os diagnósticos e regras de reconciliação</summary>
        <dl className={styles.qualityGrid}>
          {diagnostics.map(([label, count]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{count}</dd>
            </div>
          ))}
        </dl>
        <ul>
          {Object.entries(q.reconciliation).map(([key, valid]) => (
            <li key={key}>
              {
                (
                  {
                    cases: "Em aberto + recuperados + expirados = elegíveis",
                    methods: "Métodos = casos recuperados",
                    revenue: "Receita por método = receita recuperada",
                    time: "Buckets de tempo = casos recuperados",
                    uniqueOrders: "Um pedido por recuperação primária",
                  } as Record<string, string>
                )[key]
              }
              : {valid ? "OK" : "Divergência"}
            </li>
          ))}
        </ul>
      </details>
      <p className={styles.note}>
        Fonte: {data.provider}.{" "}
        {data.source === "demo"
          ? "Ingestão real de checkouts Shopify ainda indisponível. Nenhum registro de produção foi criado."
          : "Dados normalizados pelo adapter da organização."}
      </p>
    </section>
  );
}
