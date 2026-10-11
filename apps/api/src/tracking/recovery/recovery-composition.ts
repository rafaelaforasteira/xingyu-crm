import type {
  RecoveryCase,
  RecoveryCompositionMethod,
  RecoveryCompositionRow,
} from "@xingyu/types";
import { HOUR_MS } from "./recovery.config";
import { mean, rate, sumCents } from "./recovery-math";

/** Only the visual MIXED projection changes; canonical attribution and audit are preserved. */
export function compositionMethod(c: RecoveryCase): RecoveryCompositionMethod {
  if (c.attribution.method !== "MIXED") return c.attribution.method;
  const valid = (c.recoveredOrder?.signals ?? []).filter(
    (s) =>
      s.verified &&
      s.evidence.trim() &&
      ["EXPLICIT", "SIGNED_TOKEN", "ACTOR_METADATA", "MAPPED_CAMPAIGN", "MAPPED_COUPON"].includes(
        s.kind,
      ),
  );
  if (
    valid.some(
      (s) => s.method === "CONSULTANT" || (s.method === "MIXED" && Boolean(s.consultantId?.trim())),
    )
  )
    return "CONSULTANT";
  if (
    valid.some(
      (s) => s.method === "AUTOMATIC" || (s.method === "MIXED" && Boolean(s.automationId?.trim())),
    )
  )
    return "AUTOMATIC";
  return "UNKNOWN";
}
export function recoveryComposition(cases: RecoveryCase[]): RecoveryCompositionRow[] {
  const recovered = cases.filter((c) => c.status === "RECOVERED" && c.recoveredOrder);
  const ids = recovered.map((c) =>
    JSON.stringify([c.organizationId, c.provider, c.recoveredOrder!.id]),
  );
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate recovered order in composition");
  const total = sumCents(recovered.map((c) => c.recoveredOrder!.netCents));
  const classified = recovered.map((c) => ({ c, method: compositionMethod(c) }));
  return (["AUTOMATIC", "CONSULTANT", "UNKNOWN"] as const).map((method) => {
    const rows = classified.filter((r) => r.method === method).map((r) => r.c);
    const revenueCents = sumCents(rows.map((c) => c.recoveredOrder!.netCents));
    return {
      method,
      cases: rows.length,
      revenueCents,
      caseShare: rate(rows.length, recovered.length),
      revenueShare: rate(revenueCents, total),
      meanHours: mean(
        rows.map(
          (c) => (Date.parse(c.recoveredOrder!.paidAt) - Date.parse(c.abandonedAt)) / HOUR_MS,
        ),
      ),
    };
  });
}
