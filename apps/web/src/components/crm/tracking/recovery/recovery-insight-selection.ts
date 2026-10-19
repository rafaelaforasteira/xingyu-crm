import type { RecoveryInsight, RecoveryOverviewData } from "@xingyu/types";
import { recoveryCompactMoney, recoveryPercent } from "./recovery-format";
export type Discovery = { insight: RecoveryInsight; source: "descriptive" | "predictive"; value: number; unit: "percent" | "count" | "money" | "hours" | "points"; formattedValue: string; reason: string };
export function insightFact(i: RecoveryInsight | undefined, key: string): number | null {
  const v = i?.evidence.find(e => e.metric === key)?.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
// Lexicographic business priorities, not statistical scores: attribution gaps
// affecting a majority; open value greater than recovered revenue; observed
// mature-cohort change; temporal majority; eligible segment; other observations.
// Confidence and stable ID break ties. Confidence comes from the backend and is
// not interpreted as a probability or newly calculated statistical significance.
export const DISCOVERY_PRIORITIES = { attributionMajority: 0, openValue: 1, matureChange: 2, temporalMajority: 3, segment: 4, observation: 5 } as const;
export function selectDiscovery(data: RecoveryOverviewData): Discovery | undefined {
  const candidates = data.intelligence.flatMap(i => {
    if (i.confidence === "LOW" || i.confidence === "UNAVAILABLE") return [];
    const key = i.id === "early" ? "sharePercent" : i.id === "segment" ? "rate" : i.id === "coverage" ? "unknownCases" : i.id === "open" ? "openCents" : i.id === "trend" ? "deltaPoints" : null;
    if (!key) return [];
    const value = insightFact(i,key); if (value == null) return [];
    if (i.id === "early" && !(insightFact(i,"recoveredCases")! > 0)) return [];
    if (i.id === "segment" && !(insightFact(i,"matureCases")! > 0)) return [];
    if (i.id === "coverage" && !(data.summary.recoveredCases > 0 && value > 0 && value <= data.summary.recoveredCases)) return [];
    if (i.id === "open" && !(insightFact(i,"openCases")! > 0 && value >= 0)) return [];
    if (i.id === "trend" && (insightFact(i,"currentRate") == null || insightFact(i,"previousRate") == null)) return [];
    if ((i.id === "early" || i.id === "segment") && (value < 0 || value > 100)) return [];
    const unit: Discovery["unit"] = i.id === "open" ? "money" : i.id === "coverage" ? "count" : i.id === "trend" ? "points" : "percent";
    let priority: number = DISCOVERY_PRIORITIES.observation;
    let reason = "Observação elegível com evidência e confiança informadas pela fonte.";
    if(i.id === "coverage" && value > data.summary.recoveredCases / 2) { priority=DISCOVERY_PRIORITIES.attributionMajority; reason="A ausência de atribuição afeta a maioria das recuperações analisadas."; }
    else if(i.id === "open" && value > data.summary.recoveredCents) {priority=DISCOVERY_PRIORITIES.openValue; reason="O valor elegível em aberto supera a receita recuperada; representa oportunidade, não previsão.";}
    else if(i.id === "trend" && value !== 0) {priority=DISCOVERY_PRIORITIES.matureChange; reason="Mudança entre coortes maduras já elegíveis pelos critérios da fonte.";}
    else if(i.id === "early" && value > 50) {priority=DISCOVERY_PRIORITIES.temporalMajority; reason="A maioria das recuperações observadas se concentra nas primeiras 24 horas.";}
    else if(i.id === "segment") {priority=DISCOVERY_PRIORITIES.segment; reason="Segmento com amostra elegível selecionado pela análise existente.";}
    const formattedValue = unit === "money" ? recoveryCompactMoney(value) : unit === "percent" ? recoveryPercent(value) : value.toLocaleString("pt-BR",{maximumFractionDigits:1}) + (unit === "points" ? " p.p." : " pedidos");
    return [{insight:i,source:"descriptive" as const,value,unit,formattedValue,reason,priority}];
  });
  candidates.sort((a,b)=>a.priority-b.priority || (a.insight.confidence === "HIGH" ? 0 : 1)-(b.insight.confidence === "HIGH" ? 0 : 1) || a.insight.id.localeCompare(b.insight.id));
  return candidates[0];
}
export function complementaryMetric(i: RecoveryInsight, data: RecoveryOverviewData): string | undefined {
  if(i.id === "segment") {const n=insightFact(i,"matureCases");return n == null ? undefined : n.toLocaleString("pt-BR")+" carrinhos maduros";}
  if(i.id === "coverage") {
    const row=data.methodBreakdown.find(m=>m.method === "UNKNOWN");
    return row?.caseShare != null && data.summary.recoveredCases > 0 && row.cases === insightFact(i,"unknownCases") ? recoveryPercent(row.caseShare)+" das recuperações" : undefined;
  }
  if(i.id === "open") {const value=insightFact(i,"openCents");return value == null ? undefined : recoveryCompactMoney(value)+" em aberto";}
  return undefined;
}
