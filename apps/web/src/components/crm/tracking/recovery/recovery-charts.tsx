"use client";
import * as React from "react";
import { Bot, UserRound } from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { RecoveryOverviewData, RecoveryCompositionMethod } from "@xingyu/types";
import { Button } from "@/components/ui/button";
import { ConceptHelp, ChartTooltip, TrackingTooltipPortal } from "../tracking-help";
import { useInViewOnce, useTrackingMotion } from "../tracking-motion";
import { integer, dateBR } from "../tracking-format";
import {
  recoveryMoney,
  recoveryCompactMoney,
  recoveryPercent,
  recoveryHours,
} from "./recovery-format";
import { METHOD_LABELS } from "./recovery-service";
import styles from "./recovery.module.css";
import { RecoveryComposition } from "./recovery-composition";

export const METHOD_COLORS: Record<RecoveryCompositionMethod, string> = {
  AUTOMATIC: "var(--tracking-data-blue)",
  CONSULTANT: "var(--tracking-data-pink)",
  UNKNOWN: "var(--tracking-data-charcoal)",
};
export function RecoveryMethodBreakdown({ data }: { data: RecoveryOverviewData }) {
  return (
    <section className={styles.card} aria-labelledby="recovery-method-title">
      <div className={styles.sectionHead}>
        <div>
          <h2 id="recovery-method-title">Como a recuperação aconteceu</h2>
          <p>Compare a recuperação automática com a atuação humana.</p>
        </div>
        <ConceptHelp
          label="Método de recuperação"
          text="Automática e Consultora exigem evidência verificada. Participação humana verificada prevalece na composição; conflitos explícitos ficam Não identificados. Sem população exposta, não há taxa de conversão por método."
        />
      </div>
      {!data.summary.recoveredCases ? (
        <p className={styles.empty}>Ainda não houve recuperações nesta coorte.</p>
      ) : (
        <div className={styles.methodLayout}>
          {(["AUTOMATIC", "CONSULTANT"] as const).map((method) => {
            const m = data.methodBreakdown.find((row) => row.method === method);
            if (!m) return null;
            const Icon = method === "AUTOMATIC" ? Bot : UserRound;
            return (
              <article
                key={method}
                className={styles.methodCard}
                data-tone={method === "AUTOMATIC" ? "blue" : "pink"}
              >
                <div className={styles.methodCardHead}>
                  <span className={styles.methodIcon}>
                    <Icon size={23} />
                  </span>
                  <h3>{METHOD_LABELS[method]}</h3>
                  <ConceptHelp
                    label={`Recuperação ${METHOD_LABELS[method]}`}
                    text={`${m.cases} pedidos; ${recoveryPercent(m.caseShare)} dos recuperados. Receita: ${recoveryMoney(m.revenueCents)}; participação ${recoveryPercent(m.revenueShare)}. Tempo médio ${recoveryHours(m.meanHours)}. Sem inferência de conversão ou desempenho individual.`}
                  />
                </div>
                <span className={styles.metricCaption}>Receita recuperada</span>
                <strong className={styles.methodAmount}>{recoveryMoney(m.revenueCents)}</strong>
                <p className={styles.methodShare}>
                  {recoveryPercent(m.revenueShare)} <span>da receita recuperada</span>
                </p>
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    style={{ width: `${m.revenueShare ?? 0}%`, background: METHOD_COLORS[method] }}
                  />
                </div>
                <dl className={styles.methodStats}>
                  <div>
                    <dt>Pedidos recuperados</dt>
                    <dd>{m.cases}</dd>
                  </div>
                  <div>
                    <dt>Tempo médio</dt>
                    <dd>{recoveryHours(m.meanHours)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
          <RecoveryComposition data={data} />
        </div>
      )}
      <div className={styles.coverage}>
        <span>Cobertura do método de recuperação</span>
        <strong>{recoveryPercent(data.attributionCoverage.revenuePercent)} da receita</strong>
        <div className={styles.coverageTrack}>
          <div style={{ width: `${data.attributionCoverage.revenuePercent ?? 0}%` }} />
        </div>
        <span>{recoveryPercent(data.attributionCoverage.casePercent)} dos pedidos</span>
        <ConceptHelp
          label="Cobertura do método"
          text="Receita com método diferente de Não identificada ÷ receita recuperada. A versão por pedidos usa o mesmo critério sobre os casos recuperados."
        />
      </div>
      {data.summary.recoveredCases > 0 && data.attributionCoverage.identifiedCases === 0 && (
        <p className={styles.note}>
          Os pedidos recuperados ainda não possuem evidência suficiente para identificar o método.
        </p>
      )}
      <details className={styles.details}>
        <summary>Identidade da consultora e evidência</summary>
        <p className={styles.note}>
          Totais associados a evidências; sem ranking de desempenho ou comparação causal.
        </p>
        {data.consultantBreakdown.length ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Identidade registrada</th>
                <th scope="col">Pedidos</th>
                <th scope="col">Receita associada</th>
                <th scope="col">Tempo médio</th>
              </tr>
            </thead>
            <tbody>
              {data.consultantBreakdown.map((r, i) => (
                <tr key={r.id ?? i}>
                  <th scope="row">{r.label}</th>
                  <td>{r.cases}</td>
                  <td>{recoveryMoney(r.revenueCents)}</td>
                  <td>{recoveryHours(r.meanHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.empty}>Identidade da consultora não disponível na fonte atual.</p>
        )}
      </details>
    </section>
  );
}

export function RecoveryEvolution({ data }: { data: RecoveryOverviewData }) {
  const [metric, setMetric] = React.useState<"recovered" | "abandoned">("recovered"),
    [unit, setUnit] = React.useState<"value" | "carts">("value");
  const { ref, seen } = useInViewOnce<HTMLDivElement>(),
    motion = useTrackingMotion();
  const key =
    metric === "recovered"
      ? unit === "value"
        ? "recoveredCents"
        : "recoveredCases"
      : unit === "value"
        ? "abandonedCents"
        : "abandonedCases";
  const previousKey =
    metric === "recovered"
      ? unit === "value"
        ? "previousRecoveredCents"
        : "previousRecoveredCases"
      : unit === "value"
        ? "previousAbandonedCents"
        : "previousAbandonedCases";
  const formatter = unit === "value" ? recoveryMoney : integer,
    compact = unit === "value" ? recoveryCompactMoney : integer;
  const color =
    metric === "recovered" ? "var(--tracking-data-green)" : "var(--tracking-chart-muted)";
  return (
    <section className={styles.card} aria-labelledby="recovery-evolution-title">
      <div className={styles.sectionHead}>
        <div>
          <h2 id="recovery-evolution-title">Evolução da recuperação</h2>
          <p>Resultados associados à data do abandono · períodos de igual duração.</p>
        </div>
        <ConceptHelp
          label="Evolução da recuperação"
          text="Cada ponto é uma coorte pela data de abandono, não a data do pagamento. A linha anterior está alinhada pelo dia relativo do período. Carrinhos recentes podem estar imaturos."
        />
      </div>
      <div className={styles.chartControls}>
        <div className={styles.toggle}>
          {(["recovered", "abandoned"] as const).map((m) => (
            <Button
              key={m}
              variant={metric === m ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={metric === m}
              onClick={() => setMetric(m)}
            >
              {m === "recovered" ? "Receita recuperada" : "Valor abandonado"}
            </Button>
          ))}
        </div>
        <div className={styles.toggle}>
          {(["value", "carts"] as const).map((u) => (
            <Button
              key={u}
              variant={unit === u ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
            >
              {u === "value" ? "Valor" : "Carrinhos"}
            </Button>
          ))}
        </div>
      </div>
      <div
        ref={ref}
        className={styles.chart}
        role="img"
        aria-label={`${metric === "recovered" ? "Recuperação" : "Abandono"} em ${unit === "value" ? "reais" : "carrinhos"}; atual e anterior, pela coorte de abandono.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.timeline} margin={{ top: 12, right: 12, bottom: 12, left: 6 }}>
            <CartesianGrid stroke="var(--tracking-chart-grid)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => dateBR(d, "dd MMM")}
              minTickGap={24}
              tick={{ fontSize: 12, fill: "var(--tracking-fg-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              width={68}
              tickFormatter={(n) => compact(n)}
              tick={{ fontSize: 12, fill: "var(--tracking-fg-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <Line
              dataKey={key}
              name="Atual"
              stroke={color}
              strokeWidth={2.5}
              dot={false}
              type="monotone"
              isAnimationActive={!motion.reduced && motion.initial && seen}
            />
            <Line
              dataKey={unit === "value" ? "abandonedCents" : "abandonedCases"}
              name="Valor abandonado"
              hide={metric === "abandoned"}
              stroke="var(--tracking-chart-muted)"
              strokeDasharray="6 5"
              strokeWidth={1.5}
              dot={false}
              type="monotone"
              isAnimationActive={false}
            />
            <Line
              dataKey={previousKey}
              name="Anterior"
              stroke="var(--tracking-chart-muted)"
              strokeDasharray="4 4"
              dot={false}
              strokeWidth={1.5}
              type="monotone"
              isAnimationActive={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  RecoveryOverviewData["timeline"][number] | undefined;
                return active && point ? (
                  <TrackingTooltipPortal resetKey={`${point.date}-${key}-${data.updatedAt}`}>
                    <ChartTooltip
                      title={`Coorte ${dateBR(point.date)}`}
                      accent={color}
                      rows={[
                        ["Atual", formatter(point[key])],
                        [
                          "Abandonado (atual)",
                          formatter(point[unit === "value" ? "abandonedCents" : "abandonedCases"]),
                        ],
                        ["Anterior (dia equivalente)", formatter(point[previousKey])],
                      ]}
                    />
                  </TrackingTooltipPortal>
                ) : null;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.legend}>
        <span>
          <i style={{ background: color }} />
          Atual
        </span>
        <span>
          <i style={{ background: "var(--tracking-chart-muted)" }} />
          Anterior
        </span>
        {metric === "recovered" && <span>Tracejada · valor abandonado</span>}
        <span>
          {unit === "value" ? "Valores em BRL" : "Quantidade de carrinhos"} · eixo horizontal:
          abandono
        </span>
      </div>
    </section>
  );
}

export function RecoveryTimeAnalysis({ data }: { data: RecoveryOverviewData }) {
  const max = Math.max(...data.timeToRecovery.buckets.map((b) => b.cases), 1);
  const colors = ["green", "blue", "yellow", "orange", "red", "deep-red"];
  const predominant = [...data.timeToRecovery.buckets].sort((a, b) => b.cases - a.cases)[0];
  return (
    <section className={styles.card} aria-labelledby="recovery-time-title">
      <div className={styles.sectionHead}>
        <div>
          <h2 id="recovery-time-title">Tempo até a recuperação</h2>
          <p>Do abandono até o pagamento confirmado.</p>
        </div>
        <ConceptHelp
          label="Tempo até a recuperação"
          text="Média e mediana entre os casos efetivamente recuperados. Intervalos contínuos, sem lacunas; cores representam duração, não o maior grupo."
        />
      </div>
      <div className={styles.timeStats}>
        <div>
          <span>Tempo médio</span>
          <strong>{recoveryHours(data.timeToRecovery.meanHours)}</strong>
        </div>
        <div>
          <span>Mediana</span>
          <strong>{recoveryHours(data.timeToRecovery.medianHours)}</strong>
        </div>
      </div>
      {!data.summary.recoveredCases ? (
        <p className={styles.empty}>Ainda não houve recuperações nesta coorte.</p>
      ) : (
        <div className={styles.timeRows}>
          {data.timeToRecovery.buckets.map((b, i) => (
            <div key={b.key} className={styles.timeRow}>
              <span>{b.label}</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.bar}
                  style={{
                    width: `${(b.cases / max) * 100}%`,
                    background: `var(--tracking-data-${colors[i]})`,
                  }}
                />
              </div>
              <strong>
                {b.cases} · {recoveryPercent(b.share)}
              </strong>
            </div>
          ))}
        </div>
      )}
      {predominant && predominant.cases > 0 && (
        <div className={styles.timeInsight}>
          <span>Maior concentração</span>
          <strong>{predominant.label}</strong>
          <p>{recoveryPercent(predominant.share)} das recuperações observadas.</p>
        </div>
      )}
    </section>
  );
}
