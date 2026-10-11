"use client";
import type { RecoveryInsight, RecoveryOverviewData } from "@xingyu/types";
import { Sparkles, Lightbulb, ShieldCheck, ArrowUpRight, BrainCircuit } from "lucide-react";
import { ConceptHelp } from "../tracking-help";
import { recoveryMoney, recoveryPercent } from "./recovery-format";
import styles from "./recovery.module.css";

function Insight({ insight, lead = false }: { insight: RecoveryInsight; lead?: boolean }) {
  const quality = insight.category === "DATA_QUALITY";
  const tone =
    quality || insight.severity === "ATTENTION"
      ? "orange"
      : insight.category === "OPPORTUNITY"
        ? "blue"
        : "green";
  const Icon = quality
    ? ShieldCheck
    : insight.category === "OPPORTUNITY"
      ? ArrowUpRight
      : Lightbulb;
  const factKey = (
    {
      early: "sharePercent",
      coverage: "unknownCases",
      open: "openCases",
      segment: "rate",
      trend: "deltaPoints",
    } as Record<string, string>
  )[insight.id];
  const fact = insight.evidence.find((e) => e.metric === factKey)?.value;
  const factLabel =
    typeof fact === "number"
      ? insight.id === "coverage"
        ? `${fact} pedidos`
        : insight.id === "open"
          ? `${fact} carrinhos`
          : insight.id === "trend"
            ? `${fact.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`
            : recoveryPercent(fact)
      : null;
  return (
    <article className={lead ? styles.insightLead : styles.insightReading} data-tone={tone}>
      <div className={styles.insightTop}>
        <Icon size={18} />
        <span>
          {lead
            ? "Leitura principal"
            : quality
              ? "Qualidade"
              : insight.category === "OPPORTUNITY"
                ? "Oportunidade"
                : insight.category === "TREND"
                  ? "Tendência"
                  : "Padrão"}
        </span>
        {!lead && factLabel && <strong className={styles.readingFact}>{factLabel}</strong>}
        <ConceptHelp
          label={insight.title}
          text={
            <>
              <strong>Confiança: {insight.confidence}</strong>
              <dl>
                {insight.evidence.map((e) => (
                  <div key={e.metric}>
                    {e.metric}: {e.value ?? "Indisponível"}
                  </div>
                ))}
              </dl>
            </>
          }
        />
      </div>
      <h3>{insight.title}</h3>
      {lead && factLabel && <strong className={styles.leadFact}>{factLabel}</strong>}
      <p>{insight.summary}</p>
      {lead && (
        <span className={styles.editorialFoot}>
          Análise do período · evidências disponíveis no tooltip
        </span>
      )}
    </article>
  );
}
export function RecoveryIntelligence({ data }: { data: RecoveryOverviewData }) {
  const rank = { HIGH: 3, MEDIUM: 2, LOW: 1, UNAVAILABLE: 0 };
  const readings = [...data.intelligence].sort((a, b) => rank[b.confidence] - rank[a.confidence]);
  return (
    <section className={styles.intelligence} aria-labelledby="brainx-recovery-intelligence">
      <div className={styles.sectionHead}>
        <div>
          <h2 id="brainx-recovery-intelligence">
            <Sparkles size={20} /> BRAINX Intelligence
          </h2>
          <p>Análise do período · o que os dados revelam</p>
        </div>
        <span className={styles.modelBadge}>
          {data.predictionStatus.status === "LEARNING"
            ? "Modelo em aprendizado"
            : data.predictionStatus.status === "EXPERIMENTAL"
              ? "Modelo experimental"
              : "Modelo validado"}
        </span>
      </div>
      {readings.length ? (
        <div className={styles.editorialLayout}>
          <Insight insight={readings[0]!} lead />
          <div className={styles.editorialReadings}>
            {readings.slice(1).map((insight) => (
              <Insight key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      ) : (
        <p className={styles.empty}>Amostra insuficiente para padrões confiáveis neste recorte.</p>
      )}
      <p className={styles.note}>
        Insights determinísticos.{" "}
        {data.source === "demo"
          ? "Todos os fatos desta análise são demonstrativos."
          : "Não representam relação causal."}{" "}
        Ações de recuperação: disponível em breve.
      </p>
    </section>
  );
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
            <Sparkles size={20} /> Potencial de recuperação
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
            <BrainCircuit size={34} />
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
