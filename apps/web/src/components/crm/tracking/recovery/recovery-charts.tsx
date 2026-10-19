"use client";
import * as React from "react";
import { Bot, UserRound, Clock3, ChartColumn, Lightbulb } from "lucide-react";
import {
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { RecoveryOverviewData, RecoveryCompositionMethod } from "@xingyu/types";
import { Button } from "@/components/ui/button";
import { ConceptHelp, TrackingTooltipPortal } from "../tracking-help";
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
import overview from "../tracking-overview.module.css";
import { RecoveryUnitToggle } from "./recovery-unit-toggle";
import timing from "./recovery-time.module.css";
import methods from "./recovery-methods.module.css";
import evolution from "./recovery-evolution.module.css";
import { RecoveryComposition } from "./recovery-composition";

export const METHOD_COLORS: Record<RecoveryCompositionMethod, string> = {
  AUTOMATIC: "var(--tracking-data-blue)",
  CONSULTANT: "var(--tracking-data-pink)",
  UNKNOWN: "var(--tracking-data-charcoal)",
};
export function RecoveryMethodBreakdown({ data }: { data: RecoveryOverviewData }) {
  return (
    <div className={methods.blocks}>
    <section className={styles.card + " " + methods.widget} aria-labelledby="recovery-method-title">
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
        <div className={overview.profileBoard + " " + methods.board}>
          {(["AUTOMATIC", "CONSULTANT"] as const).map((method) => {
            const m = data.methodBreakdown.find((row) => row.method === method);
            if (!m) return null;
            const Icon = method === "AUTOMATIC" ? Bot : UserRound;
            return <div key={method} className={overview.profileColumn}>
              <article className={overview.profileCard + " " + methods.card} data-method={method}>
                <div className={overview.profileIdentity}>
                  <span className={overview.profileMark + " " + methods.mark}><Icon size={15} aria-hidden /></span>
                  <h3 className={overview.profileName}>{METHOD_LABELS[method]}</h3>
                  <ConceptHelp label={"Recuperação " + METHOD_LABELS[method]} text={m.cases + " pedidos; " + recoveryPercent(m.caseShare) + " dos recuperados. Receita: " + recoveryMoney(m.revenueCents) + "; participação " + recoveryPercent(m.revenueShare) + ". Tempo médio " + recoveryHours(m.meanHours) + ". Método exige evidência verificada. Participação usa a receita recuperada total, incluindo outros métodos. Sem inferência de conversão ou desempenho individual."} />
                </div>
                <div className={overview.profileMetrics + " " + methods.metrics}>
                  <strong className={overview.profileBuyers}>{integer(m.cases)}</strong>
                  <strong className={overview.profileMoney} title={recoveryMoney(m.revenueCents)}>{recoveryCompactMoney(m.revenueCents)}</strong>
                  <span className={overview.profileCaption}>Pedidos recuperados</span>
                  <span className={overview.profileCaption}>Receita recuperada</span>
                  <strong className={methods.secondary}>{recoveryPercent(m.revenueShare)}</strong>
                  <strong className={methods.secondary}>{recoveryHours(m.meanHours)}</strong>
                  <span className={overview.profileCaption}>Participação na receita</span>
                  <span className={overview.profileCaption}>Tempo médio de recuperação</span>
                </div>
              </article>
              {[
                {label:"Composição dos pedidos recuperados", share:m.caseShare},
                {label:"Composição da receita líquida", share:m.revenueShare},
              ].map(({label,share}) => <div key={label} className={overview.profileDetail + " " + methods.composition} data-method={method}>
                <div className={overview.profileDetailLabel}><span>{label}</span></div>
                <div className={overview.profileDetailTrack} role="meter" aria-label={label + " · " + METHOD_LABELS[method]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={share == null ? undefined : Math.max(0,Math.min(100,share))} aria-valuetext={recoveryPercent(share)}><span className={methods.fill} style={{width:Math.max(0,Math.min(100,share ?? 0)) + "%"}} /></div>
                <strong className={overview.profileDetailValue + " " + methods.barValue} title="Participação no total elegível recuperado do período, incluindo os demais métodos.">{recoveryPercent(share)}</strong>
              </div>)}

            </div>;
          })}
        </div>
      )}

    </section>
    <section className={styles.card + " " + methods.compositionBlock} aria-label="Composição e cobertura da recuperação">
      {data.summary.recoveredCases > 0 && <RecoveryComposition data={data} embedded />}
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
    </section>
    </div>
  );
}

export function RecoveryEvolution({ data }: { data: RecoveryOverviewData }) {
  const gradientId = React.useId().replace(/:/g, "");
  const metric: "recovered" | "abandoned" = "recovered";
  const [unit, setUnit] = React.useState<"value" | "carts">("value");
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
    metric === "recovered" ? "var(--tracking-data-green)" : "#F5B942";
  return (
    <section className={overview.chartCard + " " + overview.evolution + " " + evolution.root} aria-labelledby="recovery-evolution-title">
      <div className={styles.sectionHead + " " + evolution.header}>
        <div>
          <div className={evolution.titleRow}><h2 id="recovery-evolution-title">Evolução da recuperação</h2>
          <ConceptHelp label="Evolução da recuperação" text="Cada ponto é uma coorte pela data de abandono, não a data do pagamento. A linha anterior está alinhada pelo dia relativo do período. Carrinhos recentes podem estar imaturos." /></div>
          <p>Resultados associados à data do abandono · períodos de igual duração.</p>
        </div>
        <RecoveryUnitToggle value={unit} onChange={setUnit} />
      </div>

      <div
        ref={ref}
        className={overview.chartPlot}
        role="img"
        aria-label={`${metric === "recovered" ? "Recuperação" : "Abandono"} em ${unit === "value" ? "reais" : "carrinhos"}; atual e anterior, pela coorte de abandono.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart accessibilityLayer data={data.timeline} margin={{ top: 20, right: 18, left: 0, bottom: 16 }}>
            <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.16} /><stop offset="72%" stopColor={color} stopOpacity={0.04} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="var(--series-grid)" strokeDasharray="2 7" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => dateBR(d, "dd MMM")}
              minTickGap={24}
              tickMargin={12}
              tick={{ fontSize: 10, fill: "var(--tracking-fg-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              width={78}
              tickMargin={8}
              allowDecimals={false}
              tickFormatter={(n) => compact(n)}
              tick={{ fontSize: 10, fill: "var(--tracking-fg-muted)" }}
              axisLine={false}
              tickLine={false}
            />
            <Area
              dataKey={previousKey} name="Anterior" stroke="var(--series-gross)" strokeWidth={1.5} strokeOpacity={0.78}
              fill="transparent" dot={false} type="monotone" isAnimationActive={false}
              activeDot={{r:3.5, fill:"var(--series-gross)", stroke:"var(--tracking-surface)", strokeWidth:2}}
            />
            <Area
              dataKey={key} name="Atual" stroke={color} strokeWidth={3}
              fill={"url(#" + gradientId + ")"} dot={false} type="monotone"
              activeDot={{r:4, stroke:color, strokeWidth:2, fill:"var(--tracking-surface)"}}
              isAnimationActive={!motion.reduced && motion.initial && seen} animationDuration={350}
            />
            <Tooltip
              isAnimationActive={false}
              cursor={{stroke:"var(--series-gross)",strokeOpacity:0.45}}
              wrapperStyle={{outline:"none",zIndex:0,pointerEvents:"none"}}
              content={({ active, payload }) => {
                const point = payload?.[0]?.payload as
                  RecoveryOverviewData["timeline"][number] | undefined;
                return active && point ? (
                  <TrackingTooltipPortal resetKey={`${point.date}-${key}-${data.updatedAt}`}>
                    <div data-module-theme="tracking" className={overview.chartTip + " tracking-portal min-w-48 rounded-xl p-3 text-xs shadow-soft"}>
                      <p className="mb-2 font-semibold">Coorte {dateBR(point.date)}</p>
                      <p className="mb-2 text-muted-foreground">{metric === "recovered" ? "Receita recuperada" : "Valor abandonado"} · {unit === "value" ? "BRL" : "carrinhos"}</p>
                      {[
                        {label:"Atual", value:formatter(point[key]), swatch:color},
                        {label:"Anterior (dia equivalente)", value:formatter(point[previousKey]), swatch:"var(--tip-gross)"},
                        ...(metric === "recovered" ? [{label:"Abandonado (atual)",value:formatter(point[unit === "value" ? "abandonedCents" : "abandonedCases"]),swatch:"#F5B942"}] : []),
                      ].map((row) => <div key={row.label} className="flex items-center justify-between gap-4 py-0.5"><span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{background:row.swatch}} />{row.label}</span><strong>{row.value}</strong></div>)}
                    </div>
                  </TrackingTooltipPortal>
                ) : null;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className={overview.chartLegend}>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{background:color}} />Atual</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{background:"var(--series-gross)"}} />Anterior</span>
      </div>
    </section>
  );
}

export function RecoveryTimeAnalysis({ data }: { data: RecoveryOverviewData }) {
  const colors = ["green", "blue", "yellow", "orange", "red", "deep-red"];
  const predominant = [...data.timeToRecovery.buckets].sort((a,b)=>b.cases-a.cases)[0];
  return <section className={overview.chartCard} aria-labelledby="recovery-time-title">
    <div className="mb-4"><h2 id="recovery-time-title" className="flex items-center gap-1 font-semibold">Tempo até a recuperação<ConceptHelp label="Tempo até a recuperação" text="Do abandono até o pagamento confirmado. Média, mediana e distribuição consideram somente casos efetivamente recuperados. As faixas são contínuas e as cores representam duração, não desempenho." /></h2><p className="mt-1 text-xs text-muted-foreground">Do abandono até o pagamento confirmado.</p></div>
    <div className={overview.repurchaseStage} data-revealed="true">
      <div className={overview.repurchaseKpis + " " + timing.kpis}>
        {[{label:"Tempo médio",value:data.timeToRecovery.meanHours,tone:"average",Icon:ChartColumn,help:"Média do tempo entre abandono e pagamento dos casos recuperados."},{label:"Mediana",value:data.timeToRecovery.medianHours,tone:"median",Icon:Clock3,help:"Tempo central da distribuição dos casos recuperados; metade está abaixo e metade acima."},{label:"Faixa campeã",value:predominant && predominant.cases > 0 ? predominant.share : null,tone:"return",Icon:Clock3,help:"Participação da faixa com mais casos no total de carrinhos recuperados. É uma distribuição observada, não uma taxa de conversão entre carrinhos expostos."}].map(({label,value,tone,Icon,help})=><article key={label} className={overview.repurchaseKpi} data-tone={tone}><p className={overview.repurchaseKpiLabel}><span className={overview.repurchaseIcon}><Icon size={16} aria-hidden /></span><span>{label}<ConceptHelp label={label} text={help} /></span></p><p className={overview.repurchaseKpiValue}>{tone === "return" ? recoveryPercent(value) : recoveryHours(value)}</p><p className={overview.repurchaseInsightNote}>{tone === "return" ? predominant && predominant.cases > 0 ? predominant.label + " · das recuperações" : "Dados insuficientes" : "dos carrinhos recuperados"}</p></article>)}
      </div>
      <div className={overview.repurchaseMain + " " + timing.distribution}>
        <section className={overview.repurchasePanel} aria-label="Distribuição do tempo de recuperação"><h3 className={overview.repurchaseHeading}>Distribuição do tempo de recuperação<ConceptHelp label="Distribuição do tempo de recuperação" text="Participação de cada faixa no total de casos recuperados. Os comprimentos representam os percentuais reais, sem normalização pela maior faixa." /></h3>
          {!data.summary.recoveredCases ? <p className={styles.empty}>Ainda não houve recuperações nesta coorte.</p> : <div className={overview.repurchaseBands}>{data.timeToRecovery.buckets.map((b,i)=><div key={b.key} className={overview.repurchaseBand + " " + timing.band} style={{"--accent":"var(--tracking-data-"+colors[i]+")"} as React.CSSProperties}><div className={overview.repurchaseBandRow}><span className={overview.repurchaseBandName}>{b.label}</span><span className={overview.repurchaseTrack}><span className={timing.fill} style={{width:Math.max(0,Math.min(100,b.share ?? 0))+"%"}} /></span><span className={overview.repurchaseBandShare} title={b.cases+" carrinhos recuperados"}>{recoveryPercent(b.share)}</span></div></div>)}</div>}
        </section>

      </div>
    </div>
  </section>;
}
