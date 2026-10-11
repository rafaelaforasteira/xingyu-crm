import type { RecoveryAttribution, RecoveryOrder, RecoverySignal } from "@xingyu/types";
const PRECEDENCE: Record<RecoverySignal["kind"], number> = {
  EXPLICIT: 0,
  SIGNED_TOKEN: 1,
  ACTOR_METADATA: 2,
  MAPPED_CAMPAIGN: 3,
  MAPPED_COUPON: 3,
};
export const unknownAttribution = (
  reason = "Nenhuma evidência confiável de método foi capturada.",
): RecoveryAttribution => ({
  method: "UNKNOWN",
  confidence: "UNAVAILABLE",
  evidence: [],
  reason,
  consultantId: null,
  consultantLabel: null,
  conflict: false,
});
export class RecoveryAttributionResolver {
  resolve(order: RecoveryOrder): RecoveryAttribution {
    const signals = order.signals.filter(
      (s) =>
        s.verified &&
        s.evidence.trim() &&
        PRECEDENCE[s.kind] !== undefined &&
        ["AUTOMATIC", "CONSULTANT", "MIXED"].includes(s.method),
    );
    if (!signals.length) return unknownAttribution();
    const tier = Math.min(...signals.map((s) => PRECEDENCE[s.kind]));
    const selected = signals.filter((s) => PRECEDENCE[s.kind] === tier);
    const methods = new Set(selected.map((s) => s.method));
    const conflict = methods.size > 1 || signals.some((s) => !methods.has(s.method));
    // Contradictory explicit/signed declarations are ambiguity, not proof of joint intervention.
    if (tier <= 1 && methods.size > 1)
      return {
        ...unknownAttribution("Declarações explícitas conflitantes; método não determinado."),
        evidence: selected.map((s) => s.evidence),
        conflict: true,
      };
    const method = methods.size > 1 ? "MIXED" : selected[0].method;
    const human = selected.filter((s) => s.method !== "AUTOMATIC" && s.consultantId);
    const identities = new Set(human.map((s) => s.consultantId));
    const person = identities.size === 1 ? human[0] : null;
    return {
      method,
      confidence: tier <= 2 ? "HIGH" : "MEDIUM",
      evidence: selected.map((s) => s.evidence),
      reason: `Método baseado em ${selected.map((s) => s.kind).join(", ")}; prioridade ${tier + 1}.`,
      consultantId: person?.consultantId ?? null,
      consultantLabel: person?.consultantLabel ?? null,
      conflict,
    };
  }
}
