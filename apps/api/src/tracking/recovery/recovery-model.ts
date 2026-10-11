import type { RecoveryCase, RecoveryModelStatus } from "@xingyu/types";
import { DAY_MS, RECOVERY_RULES } from "./recovery.config";
import { businessDate } from "./recovery-math";

export interface RecoveryFeatures {
  cartCents: number;
  itemCount: number;
  uniqueSkus: number;
  discountCents: number;
  shippingRatio: number | null;
  previousOrderCount: number | null;
  previousSpentCents: number | null;
  existingCustomer: boolean | null;
  daysSinceOrder: number | null;
  hour: number;
  weekday: number;
  channel: RecoveryCase["acquisition"]["channel"];
  skus: string[];
}
export interface RecoveryTrainingRow {
  caseId: string;
  abandonedAt: string;
  labelAvailableAt: string;
  features: RecoveryFeatures;
  label: 0 | 1;
  recoveredCents: number;
}
const hourFormatters = new Map<string, Intl.DateTimeFormat>();
export function extractRecoveryFeatures(
  c: RecoveryCase,
  timezone: string,
): RecoveryFeatures | null {
  const at = Date.parse(c.abandonedAt);
  const customerAt = Date.parse(c.customer.capturedAt),
    acquisitionAt = Date.parse(c.acquisition.capturedAt);
  if (
    !Number.isFinite(customerAt) ||
    !Number.isFinite(acquisitionAt) ||
    customerAt > at ||
    acquisitionAt > at ||
    (c.customer.previousOrderAt &&
      (!Number.isFinite(Date.parse(c.customer.previousOrderAt)) ||
        Date.parse(c.customer.previousOrderAt) >= at))
  )
    return null;
  if (
    c.customer.previousOrderCount != null &&
    (!Number.isSafeInteger(c.customer.previousOrderCount) || c.customer.previousOrderCount < 0)
  )
    return null;
  if (
    c.customer.previousSpentCents != null &&
    (!Number.isSafeInteger(c.customer.previousSpentCents) || c.customer.previousSpentCents < 0)
  )
    return null;
  if (!hourFormatters.has(timezone))
    hourFormatters.set(
      timezone,
      new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }),
    );
  const time = hourFormatters.get(timezone)!.format(new Date(at));
  const localDay = businessDate(c.abandonedAt, timezone);
  return {
    cartCents: c.totalCents,
    itemCount: c.items.reduce((n, i) => n + i.quantity, 0),
    uniqueSkus: new Set(c.items.map((i) => i.sku)).size,
    discountCents: c.discountCents,
    shippingRatio: c.totalCents && c.shippingCents != null ? c.shippingCents / c.totalCents : null,
    previousOrderCount: c.customer.previousOrderCount,
    previousSpentCents: c.customer.previousSpentCents,
    existingCustomer: c.customer.type === "UNKNOWN" ? null : c.customer.type === "EXISTING",
    daysSinceOrder: c.customer.previousOrderAt
      ? (at - Date.parse(c.customer.previousOrderAt)) / DAY_MS
      : null,
    hour: Number(time),
    weekday: new Date(localDay + "T12:00:00Z").getUTCDay(),
    channel: c.acquisition.channel,
    skus: [...new Set(c.items.map((i) => i.sku))].sort(),
  };
}
export function buildTrainingDataset(
  cases: RecoveryCase[],
  timezone: string,
): RecoveryTrainingRow[] {
  return cases
    .filter((c) => c.mature && !c.match.ambiguous)
    .flatMap((c) => {
      const features = extractRecoveryFeatures(c, timezone);
      return features
        ? [
            {
              caseId: c.id,
              abandonedAt: c.abandonedAt,
              labelAvailableAt: c.recoveredOrder?.paidAt ?? c.deadline,
              features,
              label: c.status === "RECOVERED" ? (1 as const) : (0 as const),
              recoveredCents: c.recoveredOrder?.netCents ?? 0,
            },
          ]
        : [];
    })
    .sort((a, b) => a.abandonedAt.localeCompare(b.abandonedAt));
}
/** Purged chronological split: every training outcome must have been observable at the cutoff. */
export function temporalTrainingSplit(rows: RecoveryTrainingRow[], validationStart: string) {
  return {
    training: rows.filter(
      (r) => r.abandonedAt < validationStart && r.labelAvailableAt < validationStart,
    ),
    validation: rows.filter((r) => r.abandonedAt >= validationStart),
  };
}
export interface RecoveryModelProvider {
  describe(rows: RecoveryTrainingRow[], source: "demo" | "production"): RecoveryModelStatus;
  predict(features: RecoveryFeatures, status: RecoveryModelStatus): number | null;
}
export class LearningRecoveryModelProvider implements RecoveryModelProvider {
  describe(rows: RecoveryTrainingRow[], source: "demo" | "production"): RecoveryModelStatus {
    const positives = rows.filter((r) => r.label).length;
    const enough =
      rows.length >= RECOVERY_RULES.minimumMatureCases &&
      positives >= RECOVERY_RULES.minimumPositiveCases;
    return {
      status: enough && source === "production" ? "EXPERIMENTAL" : "LEARNING",
      mode: source === "demo" ? "DEMO" : "PRODUCTION",
      version: null,
      target: "recoveredWithinWindow",
      matureCases: rows.length,
      positiveCases: positives,
      excludedCases: 0,
      minimumMature: RECOVERY_RULES.minimumMatureCases,
      minimumPositive: RECOVERY_RULES.minimumPositiveCases,
      reason:
        source === "demo"
          ? "Fonte demonstrativa. Não há modelo treinado ou probabilidades de produção."
          : enough
            ? "Amostra suficiente; treinamento, validação temporal e calibração ainda necessários."
            : "Histórico maduro insuficiente para treinamento confiável.",
      validation: null,
    };
  }
  predict(): null {
    return null;
  }
}
export function canServePredictions(status: RecoveryModelStatus): boolean {
  const v = status.validation;
  return (
    status.status === "READY" &&
    status.mode === "PRODUCTION" &&
    Boolean(status.version) &&
    status.matureCases >= status.minimumMature &&
    status.positiveCases >= status.minimumPositive &&
    Boolean(
      v &&
      v.trainingEnd < v.validationStart &&
      v.validationStart <= v.calibrationEnd &&
      [
        v.rocAuc,
        v.prAuc,
        v.brier,
        v.calibrationError,
        v.precision,
        v.recall,
        v.topRevenueShare,
      ].every((n) => Number.isFinite(n) && n >= 0 && n <= 1) &&
      Number.isFinite(v.logLoss) &&
      v.logLoss >= 0 &&
      v.rocAuc >= 0.65 &&
      v.calibrationError <= 0.1,
    )
  );
}
export function calibratedPrediction(
  provider: RecoveryModelProvider,
  features: RecoveryFeatures | null,
  status: RecoveryModelStatus,
): number | null {
  if (!features || !canServePredictions(status)) return null;
  const p = provider.predict(features, status);
  return p != null && Number.isFinite(p) && p >= 0 && p <= 1 ? p : null;
}
