import type {
  RecoveryCase,
  RecoveryInsight,
  RecoveryMethod,
  RecoveryOverviewData,
  RecoveryQuery,
  RecoverySegment,
  RecoverySummary,
  RecoveryOpportunity,
  RecoveryModelStatus,
} from "@xingyu/types";
import { RECOVERY_RULES, VALUE_BANDS, TIME_BUCKETS, HOUR_MS, DAY_MS } from "./recovery.config";
import { recoveryComposition } from "./recovery-composition";
import {
  allocateCents,
  businessDate,
  mean,
  median,
  previousRange,
  rate,
  shiftDate,
  sumCents,
  wilson,
} from "./recovery-math";
import {
  buildTrainingDataset,
  calibratedPrediction,
  extractRecoveryFeatures,
  LearningRecoveryModelProvider,
  type RecoveryModelProvider,
} from "./recovery-model";

export const recoveryDelay = (c: RecoveryCase) =>
  c.recoveredOrder
    ? (Date.parse(c.recoveredOrder.paidAt) - Date.parse(c.abandonedAt)) / HOUR_MS
    : null;
export function selectRecoveryCases(
  cases: RecoveryCase[],
  q: RecoveryQuery,
  timezone: string,
): RecoveryCase[] {
  return cases.filter((c) => {
    const date = businessDate(c.abandonedAt, timezone),
      band = VALUE_BANDS.find((b) => b.key === q.valueBand);
    return (
      date >= q.startDate &&
      date <= q.endDate &&
      c.currency === (q.currency ?? "BRL") &&
      (!q.status || q.status === c.status) &&
      (!q.method || (c.status === "RECOVERED" && q.method === c.attribution.method)) &&
      (!q.customerType || q.customerType === c.customer.type) &&
      (!q.channel || q.channel === c.acquisition.channel) &&
      (!band || (c.totalCents >= band.min && c.totalCents <= band.max))
    );
  });
}
export function summarizeRecovery(cases: RecoveryCase[], outcomeFiltered = false): RecoverySummary {
  const recovered = cases.filter((c) => c.status === "RECOVERED"),
    open = cases.filter((c) => c.status === "OPEN"),
    expired = cases.filter((c) => c.status === "EXPIRED");
  return {
    eligibleCases: cases.length,
    matureCases: recovered.length + expired.length,
    openCases: open.length,
    recoveredCases: recovered.length,
    expiredCases: expired.length,
    abandonedCents: sumCents(cases.map((c) => c.totalCents)),
    recoveredCents: sumCents(recovered.map((c) => c.recoveredOrder!.netCents)),
    recoveredAbandonedCents: sumCents(recovered.map((c) => c.totalCents)),
    openCents: sumCents(open.map((c) => c.totalCents)),
    recoveryRate: outcomeFiltered
      ? null
      : rate(recovered.length, recovered.length + expired.length),
    expectedRecoverableCents: null,
  };
}
export function recoverySegments(
  cases: RecoveryCase[],
  groups: Array<{ key: string; label: string }>,
  keyFor: (c: RecoveryCase) => string,
  outcomeFiltered = false,
): RecoverySegment[] {
  return groups.map((g) => {
    const subset = cases.filter((c) => keyFor(c) === g.key),
      summary = summarizeRecovery(subset, outcomeFiltered);
    return {
      ...g,
      cases: subset.length,
      matureCases: summary.matureCases,
      recoveredCases: summary.recoveredCases,
      abandonedCents: summary.abandonedCents,
      recoveredCents: summary.recoveredCents,
      recoveryRate: summary.recoveryRate,
      meanHours: mean(subset.flatMap((c) => (c.recoveredOrder ? [recoveryDelay(c)!] : []))),
      sufficientSample: summary.matureCases >= RECOVERY_RULES.minimumSegmentCases,
      interval: outcomeFiltered ? null : wilson(summary.recoveredCases, summary.matureCases),
    };
  });
}
export function productRecovery(
  cases: RecoveryCase[],
  outcomeFiltered = false,
): RecoveryOverviewData["products"] {
  const skus = [...new Set(cases.flatMap((c) => c.items.map((i) => i.sku)))];
  return skus
    .map((sku) => {
      const subset = cases.filter((c) => c.items.some((i) => i.sku === sku)),
        s = summarizeRecovery(subset, outcomeFiltered);
      const allocated = sumCents(
        subset.map((c) =>
          c.recoveredOrder
            ? c.items.reduce(
                (n, i, index) =>
                  n +
                  (i.sku === sku
                    ? allocateCents(
                        c.recoveredOrder!.netCents,
                        c.items.map((x) => x.netCents),
                      )[index]
                    : 0),
                0,
              )
            : 0,
        ),
      );
      const abandoned = sumCents(
        subset.flatMap((c) => c.items.filter((i) => i.sku === sku).map((i) => i.netCents)),
      );
      return {
        key: sku,
        label: subset[0].items.find((i) => i.sku === sku)!.productLabel,
        cases: subset.length,
        matureCases: s.matureCases,
        recoveredCases: s.recoveredCases,
        abandonedCents: abandoned,
        recoveredCents: allocated,
        allocatedRecoveredCents: allocated,
        lineItems: subset.reduce((n, c) => n + c.items.filter((i) => i.sku === sku).length, 0),
        recoveryRate: s.recoveryRate,
        meanHours: mean(subset.flatMap((c) => (c.recoveredOrder ? [recoveryDelay(c)!] : []))),
        sufficientSample: s.matureCases >= RECOVERY_RULES.minimumSegmentCases,
        interval: outcomeFiltered ? null : wilson(s.recoveredCases, s.matureCases),
      };
    })
    .sort((a, b) => b.abandonedCents - a.abandonedCents || a.key.localeCompare(b.key));
}
export function recoveryIntelligence(
  summary: RecoverySummary,
  previous: RecoverySummary,
  methods: RecoveryOverviewData["methodBreakdown"],
  time: RecoveryOverviewData["timeToRecovery"],
  segments: RecoverySegment[],
): RecoveryInsight[] {
  const insights: RecoveryInsight[] = [];
  const add = (x: Omit<RecoveryInsight, "actionStatus">) =>
    insights.push({ ...x, actionStatus: "INFORMATIONAL" });
  if (summary.recoveredCases) {
    const early = time.buckets.slice(0, 3).reduce((n, b) => n + b.cases, 0),
      percent = rate(early, summary.recoveredCases)!;
    add({
      id: "early",
      category: "PATTERN",
      severity: "INFO",
      title: "A janela das primeiras 24 horas",
      summary: `${percent.toFixed(1).replace(".", ",")}% das recuperações observadas aconteceram em até 24 horas.`,
      evidence: [
        { metric: "recoveredWithin24Hours", value: early },
        { metric: "recoveredCases", value: summary.recoveredCases },
        { metric: "sharePercent", value: percent },
      ],
      confidence: summary.recoveredCases >= RECOVERY_RULES.minimumSegmentCases ? "HIGH" : "LOW",
    });
    const unknown = methods.find((m) => m.method === "UNKNOWN")!;
    if (unknown.cases)
      add({
        id: "coverage",
        category: "DATA_QUALITY",
        severity: "ATTENTION",
        title: "Parte da recuperação não tem método identificado",
        summary: `${unknown.cases} pedidos recuperados não possuem evidência confiável de intervenção. Origem de aquisição não determina o método.`,
        evidence: [
          { metric: "unknownCases", value: unknown.cases },
          { metric: "unknownRevenueCents", value: unknown.revenueCents },
          { metric: "unknownRevenueShare", value: unknown.revenueShare },
        ],
        confidence: "HIGH",
      });
  }
  if (summary.openCases)
    add({
      id: "open",
      category: "OPPORTUNITY",
      severity: "INFO",
      title: "Carrinhos ainda dentro da janela",
      summary: `${summary.openCases} oportunidades permanecem abertas. Priorize pelo valor e pelo padrão histórico disponível; isso não é uma previsão de ML.`,
      evidence: [
        { metric: "openCases", value: summary.openCases },
        { metric: "openCents", value: summary.openCents },
      ],
      confidence: "HIGH",
    });
  const qualified = segments
    .filter((s) => s.sufficientSample && s.recoveryRate != null)
    .sort((a, b) => b.recoveryRate! - a.recoveryRate!);
  if (qualified.length) {
    const best = qualified[0];
    add({
      id: "segment",
      category: "PATTERN",
      severity: "INFO",
      title: "Segmento com maior taxa observada",
      summary: `${best.label}: ${best.recoveryRate!.toFixed(1).replace(".", ",")}% de recuperação entre ${best.matureCases} carrinhos maduros. Associação observada, sem conclusão causal.`,
      evidence: [
        { metric: "segment", value: best.key },
        { metric: "matureCases", value: best.matureCases },
        { metric: "recoveredCases", value: best.recoveredCases },
        { metric: "rate", value: best.recoveryRate },
      ],
      confidence: "MEDIUM",
    });
  }
  if (
    summary.recoveryRate != null &&
    previous.recoveryRate != null &&
    summary.openCases === 0 &&
    previous.openCases === 0 &&
    summary.matureCases >= RECOVERY_RULES.minimumSegmentCases &&
    previous.matureCases >= RECOVERY_RULES.minimumSegmentCases
  ) {
    const delta = summary.recoveryRate - previous.recoveryRate;
    add({
      id: "trend",
      category: "TREND",
      severity: delta < 0 ? "ATTENTION" : "INFO",
      title: "Variação da recuperação madura",
      summary: `A taxa variou ${delta.toFixed(1).replace(".", ",")} p.p. frente à coorte anterior de igual duração. Carrinhos imaturos foram excluídos de ambos os denominadores.`,
      evidence: [
        { metric: "currentRate", value: summary.recoveryRate },
        { metric: "previousRate", value: previous.recoveryRate },
        { metric: "deltaPoints", value: delta },
      ],
      confidence: "MEDIUM",
    });
  }
  return insights;
}
export function analyzeRecovery(
  cases: RecoveryCase[],
  q: RecoveryQuery,
  timezone: string,
  source: "demo" | "production",
  provider: RecoveryModelProvider = new LearningRecoveryModelProvider(),
) {
  const previous = previousRange(q.startDate, q.endDate),
    current = selectRecoveryCases(cases, q, timezone),
    before = selectRecoveryCases(cases, { ...q, ...previous }, timezone);
  const outcomeFiltered = Boolean(q.status || q.method);
  const summary = summarizeRecovery(current, outcomeFiltered),
    previousSummary = summarizeRecovery(before, outcomeFiltered);
  const recovered = current.filter((c) => c.status === "RECOVERED");
  const methodBreakdown = (["AUTOMATIC", "CONSULTANT", "MIXED", "UNKNOWN"] as RecoveryMethod[]).map(
    (method) => {
      const subset = recovered.filter((c) => c.attribution.method === method),
        revenue = sumCents(subset.map((c) => c.recoveredOrder!.netCents));
      return {
        method,
        cases: subset.length,
        revenueCents: revenue,
        caseShare: rate(subset.length, recovered.length),
        revenueShare: rate(revenue, summary.recoveredCents),
        meanHours: mean(subset.map((c) => recoveryDelay(c)!)),
      };
    },
  );
  const human = recovered.filter((c) => ["CONSULTANT", "MIXED"].includes(c.attribution.method)),
    people = [...new Set(human.map((c) => c.attribution.consultantId))];
  const consultantBreakdown = people.map((id) => {
    const subset = human.filter((c) => c.attribution.consultantId === id);
    return {
      id,
      label: subset[0].attribution.consultantLabel ?? "Consultora não identificada",
      cases: subset.length,
      revenueCents: sumCents(subset.map((c) => c.recoveredOrder!.netCents)),
      meanHours: mean(subset.map((c) => recoveryDelay(c)!)),
    };
  });
  const buckets = TIME_BUCKETS.map((b, index) => {
    const n = recovered.filter(
      (c) =>
        recoveryDelay(c)! <= b.max &&
        (index === 0 || recoveryDelay(c)! > TIME_BUCKETS[index - 1].max),
    ).length;
    return { key: b.key, label: b.label, cases: n, share: rate(n, recovered.length) };
  });
  const timeToRecovery = {
    meanHours: mean(recovered.map((c) => recoveryDelay(c)!)),
    medianHours: median(recovered.map((c) => recoveryDelay(c)!)),
    buckets,
  };
  const customerSegments = recoverySegments(
    current,
    [
      { key: "NEW", label: "Novos clientes" },
      { key: "EXISTING", label: "Base existente" },
      { key: "UNKNOWN", label: "Cliente não identificado" },
    ],
    (c) => c.customer.type,
    outcomeFiltered,
  );
  const valueSegments = recoverySegments(
    current,
    VALUE_BANDS,
    (c) => VALUE_BANDS.find((b) => c.totalCents >= b.min && c.totalCents <= b.max)!.key,
    outcomeFiltered,
  );
  const channels = recoverySegments(
    current,
    [...new Set(current.map((c) => c.acquisition.channel))]
      .sort()
      .map((key) => ({ key, label: key })),
    (c) => c.acquisition.channel,
    outcomeFiltered,
  );
  const dates = (Date.parse(q.endDate) - Date.parse(q.startDate)) / DAY_MS + 1;
  const granularity = dates <= 31 ? 1 : dates <= 180 ? 7 : 30;
  const timeline: RecoveryOverviewData["timeline"] = [];
  // Align current and previous by cohort-day index, never by order payment date.
  for (let i = 0; i < dates; i += granularity) {
    const end = Math.min(i + granularity - 1, dates - 1);
    const point = (input: RecoveryCase[], start: string) =>
      summarizeRecovery(
        input.filter((c) => {
          const d = businessDate(c.abandonedAt, timezone);
          return d >= shiftDate(start, i) && d <= shiftDate(start, end);
        }),
      );
    const a = point(current, q.startDate),
      b = point(before, previous.startDate);
    timeline.push({
      date: shiftDate(q.startDate, i),
      abandonedCents: a.abandonedCents,
      recoveredCents: a.recoveredCents,
      abandonedCases: a.eligibleCases,
      recoveredCases: a.recoveredCases,
      previousAbandonedCents: b.abandonedCents,
      previousRecoveredCents: b.recoveredCents,
      previousAbandonedCases: b.eligibleCases,
      previousRecoveredCases: b.recoveredCases,
    });
  }
  const training = buildTrainingDataset(
    cases.filter((c) => c.currency === (q.currency ?? "BRL")),
    timezone,
  );
  const predictionStatus = provider.describe(training, source);
  predictionStatus.excludedCases = cases.length - training.length;
  const identified = methodBreakdown.filter((m) => m.method !== "UNKNOWN");
  const identifiedCases = identified.reduce((n, m) => n + m.cases, 0),
    identifiedCents = sumCents(identified.map((m) => m.revenueCents));
  const predictions = current
    .filter((c) => c.status === "OPEN")
    .map((c) =>
      calibratedPrediction(provider, extractRecoveryFeatures(c, timezone), predictionStatus),
    );
  summary.expectedRecoverableCents =
    predictionStatus.status === "READY" && predictions.length && predictions.every((p) => p != null)
      ? sumCents(
          current
            .filter((c) => c.status === "OPEN")
            .map((c, i) => Math.round(c.totalCents * predictions[i]!)),
        )
      : null;
  const predictionDistribution =
    predictions.length && predictions.every((p) => p != null)
      ? ["VERY_HIGH", "HIGH", "MEDIUM", "LOW", "VERY_LOW"].map((band, i) => ({
          band,
          cases: predictions.filter((p) => {
            const index = RECOVERY_RULES.probabilityBands.findIndex((t) => p! >= t);
            return (index === -1 ? 4 : index) === i;
          }).length,
        }))
      : null;
  return {
    range: { startDate: q.startDate, endDate: q.endDate },
    previousRange: previous,
    summary,
    previousSummary,
    methodBreakdown,
    compositionBreakdown: recoveryComposition(recovered),
    consultantBreakdown,
    attributionCoverage: {
      identifiedCases,
      identifiedCents,
      casePercent: rate(identifiedCases, summary.recoveredCases),
      revenuePercent: rate(identifiedCents, summary.recoveredCents),
    },
    timeline,
    timeToRecovery,
    customerSegments,
    valueSegments,
    channels,
    products: productRecovery(current, outcomeFiltered),
    intelligence: recoveryIntelligence(
      summary,
      previousSummary,
      methodBreakdown,
      timeToRecovery,
      customerSegments,
    ),
    predictionStatus,
    predictionDistribution,
  };
}
export function recoveryOpportunities(
  cases: RecoveryCase[],
  q: RecoveryQuery,
  timezone: string,
  asOf: string,
  status: RecoveryModelStatus,
  provider: RecoveryModelProvider = new LearningRecoveryModelProvider(),
): RecoveryOpportunity[] {
  const training = buildTrainingDataset(
    cases.filter((c) => c.currency === (q.currency ?? "BRL")),
    timezone,
  );
  return selectRecoveryCases(cases, q, timezone)
    .filter((c) => c.status === "OPEN")
    .map((c) => {
      const history = training.filter(
        (r) =>
          r.abandonedAt < c.abandonedAt &&
          r.labelAvailableAt <= asOf &&
          r.features.existingCustomer ===
            (c.customer.type === "UNKNOWN" ? null : c.customer.type === "EXISTING"),
      );
      const positives = history.filter((r) => r.label).length;
      const historicalRate =
        history.length >= RECOVERY_RULES.minimumSegmentCases
          ? rate(positives, history.length)
          : null;
      const probability = calibratedPrediction(
        provider,
        extractRecoveryFeatures(c, timezone),
        status,
      );
      const expectedCents = probability == null ? null : Math.round(c.totalCents * probability);
      const historicalEstimateCents =
        historicalRate == null
          ? null
          : Number(
              (BigInt(c.totalCents) * BigInt(positives) + BigInt(Math.floor(history.length / 2))) /
                BigInt(history.length),
            );
      return {
        id: c.id,
        checkoutLabel: c.externalCheckoutId,
        customerLabel: c.customer.label ?? "Cliente não identificado",
        customerType: c.customer.type,
        channel: c.acquisition.channel,
        abandonedCents: c.totalCents,
        abandonedAt: c.abandonedAt,
        ageHours: Math.max(
          0,
          (Math.min(Date.parse(asOf), Date.parse(c.observedUntil)) - Date.parse(c.abandonedAt)) /
            HOUR_MS,
        ),
        remainingHours: Math.max(
          0,
          (Date.parse(c.deadline) - Math.min(Date.parse(asOf), Date.parse(c.observedUntil))) /
            HOUR_MS,
        ),
        itemCount: c.items.reduce((n, i) => n + i.quantity, 0),
        probability,
        expectedCents,
        historicalRate,
        historicalEstimateCents,
        priority:
          probability != null
            ? ("PREDICTIVE" as const)
            : historicalRate != null
              ? ("HISTORICAL" as const)
              : ("VALUE" as const),
        explanation:
          probability != null
            ? "Valor × probabilidade calibrada do modelo."
            : historicalRate != null
              ? `Estimativa histórica: ${positives}/${history.length} casos maduros anteriores do mesmo perfil; não é ML.`
              : "Amostra histórica insuficiente. Ordenação pelo valor do carrinho.",
        matchAmbiguous: c.match.ambiguous,
      };
    });
}
