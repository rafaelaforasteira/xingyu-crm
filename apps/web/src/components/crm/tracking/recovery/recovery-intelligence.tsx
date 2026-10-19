"use client";
import type { RecoveryInsight, RecoveryOverviewData } from "@xingyu/types";
import { Clock3, TrendingUp, ShieldAlert, ShoppingCart, Lightbulb } from "lucide-react";
import { AIIcon } from "@/components/ui/ai-icon";
import { ConceptHelp } from "../tracking-help";
import { recoveryMoney, recoveryPercent, recoveryCompactMoney } from "./recovery-format";
import styles from "./recovery.module.css";
import panel from "./recovery-insights.module.css";
import executive from "../tracking-executive.module.css";
import { selectDiscovery, type Discovery } from "./recovery-insight-selection";

function fact(insight: RecoveryInsight | undefined, key: string): number | null {
  const value = insight?.evidence.find((e) => e.metric === key)?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function Evidence({ insight }: { insight: RecoveryInsight }) {
  return <><strong>{insight.title}</strong><p>{insight.summary}</p><p>Confiança: {insight.confidence}</p><p>Associação observada, sem conclusão causal. Origem de aquisição não determina o método. Oportunidades abertas não são vendas garantidas. Taxas de segmentos usam carrinhos maduros elegíveis; atribuição usa o universo de recuperações analisadas.</p><dl>{insight.evidence.map((e) => <div key={e.metric}><dt>{e.metric}</dt><dd>{e.value ?? "Indisponível"}</dd></div>)}</dl></>;
}
function InsightValue({ insight }: { insight: RecoveryInsight }) {
  const key = insight.id === "early" ? "sharePercent" : insight.id === "segment" ? "rate" : insight.id === "coverage" ? "unknownCases" : insight.id === "open" ? "openCases" : "deltaPoints";
  const value = fact(insight, key);
  if (value == null) return <>—</>;
  if (insight.id === "early" || insight.id === "segment") return <>{recoveryPercent(value)}</>;
  return <>{value.toLocaleString("pt-BR", {maximumFractionDigits: 1})}<small>{insight.id === "coverage" ? "pedidos" : insight.id === "open" ? "carrinhos" : "p.p."}</small></>;
}
function IntelligenceDiscovery({ discovery }: { discovery?: Discovery }) {
  const insight = discovery?.insight;
  const Icon = insight?.id === "early" ? Clock3 : insight?.id === "coverage" ? ShieldAlert : insight?.id === "open" ? ShoppingCart : TrendingUp;
  return <article className={panel.discovery}>
    <div className={panel.discoveryHead}><Icon size={16} aria-hidden /><span className={executive.eyebrow}>Principal descoberta do período</span>{insight && <ConceptHelp label={insight.title} text={<Evidence insight={insight} />} />}</div>
    <strong className={panel.value}>{discovery?.formattedValue ?? "—"}</strong>
    <h3 className={executive.insightTitle}>{insight?.title ?? "Dados insuficientes para identificar uma descoberta relevante neste período."}</h3>
    <p className={executive.insightText}>{insight?.summary ?? "Amostra insuficiente para padrões confiáveis neste recorte."}</p>
  </article>;
}
function IntelligenceInsight({ insight, data }: { insight: RecoveryInsight; data: RecoveryOverviewData }) {
  const quality = insight.id === "coverage", opportunity = insight.id === "open", segment = insight.id === "segment";
  const Icon = quality ? ShieldAlert : opportunity ? ShoppingCart : segment ? TrendingUp : Lightbulb;
  const title = quality ? "Atribuição não identificada" : opportunity ? "Oportunidades abertas" : segment ? "Maior taxa observada" : insight.title;
  // The server-provided segment context is retained verbatim, including its sample.
  const description = quality ? "Qualidade dos dados" : opportunity ? "Dentro da janela de recuperação" : segment ? insight.summary.split(":")[0] : insight.summary;
  return <article className={panel.reading} data-tone={quality ? "orange" : opportunity ? "blue" : "green"}>
    <span className={panel.contextIcon}><Icon size={17} aria-hidden /></span>
    <div className={panel.readingCopy}><div className={panel.cardHead}><h3>{title}</h3><ConceptHelp label={title} text={<Evidence insight={insight} />} /></div><p>{description}</p></div>
    <div className={panel.metricColumns}>
      <div className={panel.numericCell}><strong>{segment ? recoveryPercent(fact(insight,"rate")) : quality ? recoveryPercent(data.summary.recoveredCases > 0 && data.methodBreakdown.find(m => m.method === "UNKNOWN")?.cases === fact(insight,"unknownCases") ? data.methodBreakdown.find(m => m.method === "UNKNOWN")?.caseShare ?? null : null) : opportunity ? recoveryCompactMoney(fact(insight,"openCents")) : "—"}</strong><span>{segment ? "Taxa de recuperação" : quality ? "Das recuperações" : "Valor em aberto"}</span></div>
      <div className={panel.numericCell}><strong>{(fact(insight,segment ? "matureCases" : quality ? "unknownCases" : "openCases"))?.toLocaleString("pt-BR") ?? "—"}</strong><span>{segment ? "Carrinhos maduros" : quality ? "Pedidos" : "Carrinhos"}</span></div>
    </div>
  </article>;
}
export function RecoveryIntelligence({ data }: { data: RecoveryOverviewData }) {
  const rank = { HIGH: 3, MEDIUM: 2, LOW: 1, UNAVAILABLE: 0 };
  const readings = [...data.intelligence].sort((a,b) => rank[b.confidence] - rank[a.confidence]);
  const discovery = selectDiscovery(data);
  const order = ["segment", "coverage", "open"];
  const complementary = readings.filter((i) => ["segment", "coverage", "open"].includes(i.id)).sort((a,b) => {
    const position = (id: string) => order.includes(id) ? order.indexOf(id) : order.length;
    return position(a.id) - position(b.id);
  });
  return <section className={panel.panel} aria-labelledby="brainx-recovery-intelligence">
    <header className={panel.header}><div className={panel.identity}><span className={panel.bot}><AIIcon size={20} aria-hidden /></span><div><div className={panel.cardHead}><h2 id="brainx-recovery-intelligence" className={executive.sectionTitle}>Brainx Intelligence</h2><ConceptHelp label="Brainx Intelligence" text="O Brainx Intelligence analisa os dados comerciais e identifica padrões, oportunidades e pontos de atenção, destacando as descobertas mais relevantes do período. As análises podem utilizar métodos estatísticos, regras analíticas ou modelos de Machine Learning, conforme os recursos efetivamente disponíveis. Este painel utiliza análise descritiva determinística. Evidências não implicam causalidade; oportunidades não são vendas garantidas. Ações de recuperação disponíveis em breve." /></div><p>O que os dados revelam sobre a recuperação</p></div></div><span className={panel.status}>Análise descritiva</span></header>
    <div className={panel.composition}><IntelligenceDiscovery discovery={discovery} />{complementary.length > 0 && <div className={panel.readings}>{complementary.map((i) => <IntelligenceInsight key={i.id} insight={i} data={data} />)}</div>}</div>

  </section>;
}
export function RecoveryPrediction({ data }: { data: RecoveryOverviewData }) {
  const m = data.predictionStatus;
  const ready = m.status === "READY" && data.predictionDistribution != null;
  const progress = Math.min(100, m.minimumMature > 0 ? (m.matureCases / m.minimumMature) * 100 : 0);
  return (
    <section
      className={styles.card + " " + styles.prediction}
      aria-labelledby="recovery-model-title"
    >
      <div className={styles.sectionHead}>
        <div>
          <h2 id="recovery-model-title">
            <AIIcon size={20} /> Potencial de recuperação
          </h2>
          <p>BRAINX Predictive Intelligence</p>
        </div>
        <ConceptHelp
          label="Modelo preditivo"
          text="Features anteriores ao abandono, somente labels maduros, validação temporal sem vazamento e calibração. Probabilidades são publicadas apenas quando o modelo está READY com dados reais."
        />
      </div>
      <div className={styles.predictiveLayout}>
        <div className={styles.predictiveStory}>
          <span className={styles.predictiveSymbol} aria-hidden>
            <AIIcon size={34} />
          </span>
          <strong>
            {ready
              ? "Receita recuperável estimada"
              : m.status === "EXPERIMENTAL"
                ? "Modelo experimental"
                : "Modelo em aprendizado"}
          </strong>
          {ready && (
            <span className={styles.predictiveAmount}>
              {recoveryMoney(data.summary.expectedRecoverableCents)}
            </span>
          )}
          <p>{m.reason}</p>
          <span className={styles.modelBadge}>
            {m.mode === "DEMO"
              ? "Fonte demonstrativa · sem previsão de produção"
              : (m.version ?? "Sem versão treinada")}
          </span>
        </div>
        <div className={styles.modelProgress}>
          <div className={styles.progressHeading}>
            <span>Histórico elegível</span>
            <strong>
              {m.matureCases.toLocaleString("pt-BR")} <small>/ mínimo {m.minimumMature}</small>
            </strong>
          </div>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="Casos maduros em relação ao mínimo de amostra"
            aria-valuemin={0}
            aria-valuemax={m.minimumMature}
            aria-valuenow={Math.min(m.matureCases, m.minimumMature)}
            aria-valuetext={`${m.matureCases} casos maduros; mínimo ${m.minimumMature}. Amostra não significa modelo validado.`}
          >
            <div style={{ width: `${progress}%` }} />
          </div>
          <dl className={styles.modelMetrics}>
            <div>
              <dt>Casos maduros elegíveis</dt>
              <dd>
                {m.matureCases} / mínimo {m.minimumMature}
              </dd>
            </div>
            <div>
              <dt>Recuperações elegíveis</dt>
              <dd>
                {m.positiveCases} / mínimo {m.minimumPositive}
              </dd>
            </div>
            <div>
              <dt>Validação</dt>
              <dd>
                {m.validation
                  ? "Métricas disponíveis"
                  : m.mode === "DEMO"
                    ? "Não realizada · fonte demo"
                    : "Ainda não disponível"}
              </dd>
            </div>
            <div>
              <dt>Probabilidade do modelo</dt>
              <dd>{ready ? "Calibrada" : "Indisponível"}</dd>
            </div>
            <div>
              <dt>Receita estimada pelo modelo</dt>
              <dd>{recoveryMoney(data.summary.expectedRecoverableCents)}</dd>
            </div>
          </dl>
          {!ready && (
            <p className={styles.note}>
              O mínimo de amostra é apenas uma etapa. Treinamento, validação temporal e calibração
              ainda são necessários.
            </p>
          )}
        </div>
      </div>
      {data.predictionDistribution && (
        <div className={styles.predictionBands}>
          {data.predictionDistribution.map((b, i) => (
            <div key={b.band}>
              <span>{["Muito alta", "Alta", "Média", "Baixa", "Muito baixa"][i]}</span>
              <strong>{b.cases}</strong>
            </div>
          ))}
        </div>
      )}
      <p className={styles.note}>
        O ranking histórico usa frequência empírica com amostra mínima. Não é probabilidade de ML
        nem receita garantida. Janela de {data.attributionDays} dias.
      </p>
    </section>
  );
}
