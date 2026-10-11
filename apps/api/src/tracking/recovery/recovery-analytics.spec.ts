import type { RecoveryCase, RecoveryOrder, RecoverySignal } from "@xingyu/types";
import { checkout, paidOrder, FIXTURE_AS_OF } from "./recovery-fixtures";
import { reconcileRecovery } from "./recovery-matching";
import { RecoveryAttributionResolver } from "./recovery-attribution";
import { analyzeRecovery, summarizeRecovery, recoveryOpportunities } from "./recovery-analytics";
import {
  allocateCents,
  businessDate,
  previousRange,
  sumCents,
  decimalStringToCents,
} from "./recovery-math";
import {
  buildTrainingDataset,
  extractRecoveryFeatures,
  temporalTrainingSplit,
  LearningRecoveryModelProvider,
  calibratedPrediction,
} from "./recovery-model";
import { RECOVERY_RULES } from "./recovery.config";

const reconcile = (c = [checkout()], o: RecoveryOrder[] = [paidOrder()]) =>
  reconcileRecovery(c, o, "org-a", FIXTURE_AS_OF);
const query = { startDate: "2026-09-01", endDate: "2026-10-10" };
function assertFinite(value: unknown) {
  if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
  else if (value && typeof value === "object")
    for (const v of Object.values(value)) assertFinite(v);
}
describe("Recovery normalization and maturity", () => {
  it("converts provider decimal strings without floating point rounding", () => {
    expect(decimalStringToCents("0.10")).toBe(10);
    expect(decimalStringToCents("100.01")).toBe(10001);
    expect(decimalStringToCents("1.1")).toBe(110);
    for (const invalid of ["1.001", "-1", "1e3", "9007199254740992"])
      expect(() => decimalStringToCents(invalid)).toThrow();
  });
  it("classifies open, recovered and expired without poisoning the denominator", () => {
    const { cases } = reconcile([
      checkout(),
      checkout("open", "2026-10-09T15:00:00Z"),
      checkout("expired", "2026-09-01T15:00:00Z"),
    ]);
    expect(cases.map((c) => c.status)).toEqual(["RECOVERED", "OPEN", "EXPIRED"]);
    const s = summarizeRecovery(cases);
    expect(s.matureCases).toBe(2);
    expect(s.recoveryRate).toBe(50);
    expect(s.abandonedCents).toBe(30003);
    expect(s.recoveredCents).toBe(9901);
    expect(s.recoveredAbandonedCents).toBe(10001);
    expect(s.openCents).toBe(10001);
  });
  it("makes early recovery mature before the full window ends", () => {
    const c = checkout("recent", "2026-10-09T15:00:00Z");
    const o = paidOrder("r", { checkoutId: "recent", paidAt: "2026-10-10T10:00:00Z" });
    expect(reconcile([c], [o]).cases[0].mature).toBe(true);
  });
  it("expires exactly at the configured deadline and rejects truncated old observations", () => {
    const at = "2026-09-25T15:00:00.000Z";
    expect(reconcile([checkout("boundary", at)], []).cases[0].status).toBe("EXPIRED");
    const result = reconcile(
      [checkout("stale", at, { observedUntil: "2026-09-27T15:00:00Z" })],
      [],
    );
    expect(result.cases).toHaveLength(0);
    expect(result.quality.invalidCases).toBe(1);
  });
  it("has null rates without mature outcomes", () =>
    expect(
      summarizeRecovery(reconcile([checkout("open", "2026-10-09T15:00:00Z")], []).cases)
        .recoveryRate,
    ).toBeNull());
  it("deduplicates identical snapshots and excludes conflicting or invalid records", () => {
    const c = checkout();
    const r = reconcile(
      [
        c,
        { ...c, id: "duplicate" },
        checkout("missing", undefined, { totalCents: null }),
        checkout("fraction", undefined, { totalCents: 1.1 }),
      ],
      [],
    );
    expect(r.cases).toHaveLength(1);
    expect(r.quality.duplicatedCheckouts).toBe(1);
    expect(r.quality.invalidCases).toBe(2);
    expect(r.quality.missingValues).toBe(1);
    expect(reconcile([c, { ...c, totalCents: 999 }], []).cases).toHaveLength(0);
  });
  it("does not accept monetary overflow", () => {
    expect(() => sumCents([Number.MAX_SAFE_INTEGER, 1])).toThrow();
    expect(() => sumCents([-0.01])).toThrow();
  });
});
describe("Deterministic checkout to order matching", () => {
  it("uses explicit checkout identity rather than equal customer identity", () => {
    const r = reconcile(
      [checkout("first"), checkout("second", "2026-09-15T16:00:00Z")],
      [paidOrder("p", { checkoutId: "second" })],
    );
    expect(r.cases.filter((c) => c.status === "RECOVERED").map((c) => c.id)).toEqual(["second"]);
    expect(r.cases[1].match.confidence).toBe("HIGH");
  });
  it("uses explicit case and checkout tokens in their respective tiers", () => {
    for (const evidence of [
      { recoveryCaseId: "case-1" },
      { checkoutToken: "token" },
      { providerRelationshipId: "case-1" },
    ]) {
      const r = reconcile(
        [checkout("case-1", undefined, { checkoutToken: "token" })],
        [paidOrder("p", { checkoutId: undefined, ...evidence })],
      );
      expect(r.cases[0].status).toBe("RECOVERED");
    }
  });
  it("does not match solely on customer identity and requires opt-in for basket fallback", () => {
    const o = paidOrder("p", { checkoutId: undefined });
    expect(reconcile(undefined, [o]).cases[0].status).toBe("EXPIRED");
    const r = reconcileRecovery(
      [checkout("old"), checkout("near", "2026-09-15T16:00:00Z")],
      [o],
      "org-a",
      FIXTURE_AS_OF,
      { allowIdentityBasketMatch: true },
    );
    expect(r.cases.filter((c) => c.status === "RECOVERED").map((c) => c.id)).toEqual(["near"]);
  });
  it("never uses one order twice and handles equivalent evidence as ambiguous", () => {
    const c = checkout("a", undefined, { checkoutToken: "shared" }),
      b = { ...c, id: "b", externalCheckoutId: "b" };
    const r = reconcile(
      [c, b],
      [paidOrder("p", { checkoutId: undefined, checkoutToken: "shared" })],
    );
    expect(r.cases.filter((c) => c.recoveredOrder)).toHaveLength(0);
    expect(r.quality.ambiguousCases).toBe(2);
    const one = reconcile([checkout(), checkout("second")], [paidOrder(), paidOrder()]);
    expect(one.cases.filter((c) => c.recoveredOrder)).toHaveLength(1);
    expect(one.quality.duplicatedOrders).toBe(1);
  });
  it("does not guess between competing explicit relationships", () => {
    const r = reconcile(
      [checkout("a"), checkout("b")],
      [paidOrder("p", { checkoutId: "a", recoveryCaseId: "b" })],
    );
    expect(r.quality.ambiguousCases).toBe(2);
    expect(r.cases.some((c) => c.recoveredOrder)).toBe(false);
  });
  it("rejects future, late, pre-abandonment, unpaid, wrong-currency and foreign-tenant orders", () => {
    for (const extra of [
      { paidAt: "2026-09-10T15:00:00Z" },
      { paidAt: "2026-10-02T15:00:00Z" },
      { paidAt: "2026-11-01T15:00:00Z" },
      { status: "UNPAID" as const },
      { currency: "USD" },
      { organizationId: "org-b" },
    ])
      expect(
        reconcile(undefined, [paidOrder("invalid", extra)]).cases[0].recoveredOrder,
      ).toBeNull();
    expect(
      reconcile([checkout("foreign", undefined, { organizationId: "org-b" })], []).cases,
    ).toHaveLength(0);
  });
});
describe("Recovery attribution evidence", () => {
  const resolver = new RecoveryAttributionResolver();
  const signal = (
    method: RecoverySignal["method"],
    kind: RecoverySignal["kind"] = "ACTOR_METADATA",
  ): RecoverySignal => ({ method, kind, verified: true, evidence: "verified fixture" });
  it.each(["AUTOMATIC", "CONSULTANT", "MIXED"] as const)(
    "resolves %s only from verified evidence",
    (method) =>
      expect(resolver.resolve(paidOrder("p", { signals: [signal(method)] })).method).toBe(method),
  );
  it("does not infer consultant from WhatsApp, coupons or absent evidence", () => {
    expect(resolver.resolve(paidOrder()).method).toBe("UNKNOWN");
    expect(
      resolver.resolve(
        paidOrder("p", {
          signals: [{ ...signal("CONSULTANT", "MAPPED_COUPON"), verified: false }],
        }),
      ).method,
    ).toBe("UNKNOWN");
  });
  it("classifies genuine competing interventions as mixed but conflicting explicit declarations as unknown", () => {
    expect(
      resolver.resolve(paidOrder("p", { signals: [signal("AUTOMATIC"), signal("CONSULTANT")] }))
        .method,
    ).toBe("MIXED");
    const r = resolver.resolve(
      paidOrder("p", {
        signals: [signal("AUTOMATIC", "EXPLICIT"), signal("CONSULTANT", "EXPLICIT")],
      }),
    );
    expect(r.method).toBe("UNKNOWN");
    expect(r.conflict).toBe(true);
  });
  it("applies precedence and never invents consultant identity", () => {
    const a = resolver.resolve(
      paidOrder("p", {
        signals: [signal("AUTOMATIC", "EXPLICIT"), signal("CONSULTANT", "MAPPED_CAMPAIGN")],
      }),
    );
    expect(a.method).toBe("AUTOMATIC");
    expect(a.conflict).toBe(true);
    expect(
      resolver.resolve(paidOrder("p", { signals: [signal("CONSULTANT")] })).consultantId,
    ).toBeNull();
  });
});
describe("Recovery aggregation and invariant properties", () => {
  const c = [
    ...Array.from({ length: 12 }, (_, i) =>
      checkout("c" + i, i < 6 ? "2026-09-10T15:00:00Z" : "2026-10-09T15:00:00Z", {
        customer: { ...checkout().customer, type: i % 2 ? "NEW" : "EXISTING" },
        acquisition: { channel: i % 2 ? "WHATSAPP" : "EMAIL", capturedAt: "2026-09-01T00:00:00Z" },
      }),
    ),
    checkout("past", "2026-08-10T15:00:00Z"),
  ];
  const methods = ["AUTOMATIC", "CONSULTANT", "MIXED", "UNKNOWN"] as const;
  const orders = c.slice(0, 4).map((x, i) =>
    paidOrder("p" + i, {
      checkoutId: x.externalCheckoutId,
      paidAt: "2026-09-11T15:00:00Z",
      signals:
        i === 3
          ? []
          : [
              {
                kind: "EXPLICIT",
                method: methods[i] as Exclude<(typeof methods)[number], "UNKNOWN">,
                verified: true,
                evidence: "fixture",
              },
            ],
    }),
  );
  const cases = reconcile(c, orders).cases;
  it("reconciles method counts, revenue, time, segments and product allocation exactly", () => {
    const a = analyzeRecovery(cases, query, "America/Sao_Paulo", "demo");
    expect(a.methodBreakdown.reduce((n, m) => n + m.cases, 0)).toBe(a.summary.recoveredCases);
    expect(sumCents(a.methodBreakdown.map((m) => m.revenueCents))).toBe(a.summary.recoveredCents);
    expect(a.timeToRecovery.buckets.reduce((n, b) => n + b.cases, 0)).toBe(
      a.summary.recoveredCases,
    );
    for (const groups of [a.customerSegments, a.valueSegments, a.channels]) {
      expect(groups.reduce((n, s) => n + s.cases, 0)).toBe(a.summary.eligibleCases);
      expect(sumCents(groups.map((s) => s.recoveredCents))).toBe(a.summary.recoveredCents);
    }
    expect(sumCents(a.products.map((p) => p.allocatedRecoveredCents))).toBe(
      a.summary.recoveredCents,
    );
    expect(a.attributionCoverage.casePercent).toBe(75);
    expect(a.attributionCoverage.revenuePercent).toBe(75);
    expect(allocateCents(101, [1, 1, 1])).toEqual([34, 34, 33]);
  });
  it("keeps all filter combinations mathematically consistent and avoids outcome-selection rates", () => {
    for (const status of [undefined, "OPEN", "RECOVERED", "EXPIRED"] as const)
      for (const method of [undefined, ...methods])
        for (const customerType of [undefined, "NEW", "EXISTING"] as const)
          for (const channel of [undefined, "EMAIL", "WHATSAPP"] as const)
            for (const valueBand of [undefined, "small", "medium"]) {
              const a = analyzeRecovery(
                  cases,
                  { ...query, status, method, customerType, channel, valueBand },
                  "America/Sao_Paulo",
                  "demo",
                ),
                s = a.summary;
              expect(s.recoveredCases + s.openCases + s.expiredCases).toBe(s.eligibleCases);
              expect(s.recoveredCases).toBeLessThanOrEqual(s.matureCases);
              expect(s.recoveredCents).toBeGreaterThanOrEqual(0);
              expect(s.openCents).toBeGreaterThanOrEqual(0);
              expect(a.attributionCoverage.identifiedCases).toBeLessThanOrEqual(s.recoveredCases);
              if (s.recoveryRate != null) {
                expect(s.recoveryRate).toBeGreaterThanOrEqual(0);
                expect(s.recoveryRate).toBeLessThanOrEqual(100);
              }
              if (status || method) expect(s.recoveryRate).toBeNull();
              expect(a.methodBreakdown.reduce((n, m) => n + m.cases, 0)).toBe(s.recoveredCases);
              expect(sumCents(a.methodBreakdown.map((m) => m.revenueCents))).toBe(s.recoveredCents);
              assertFinite(a);
            }
  }, 30000);
  it("has equal-length previous cohorts and a business-timezone boundary", () => {
    expect(previousRange("2026-10-01", "2026-10-10")).toEqual({
      startDate: "2026-09-21",
      endDate: "2026-09-30",
    });
    expect(businessDate("2026-10-01T02:59:00Z", "America/Sao_Paulo")).toBe("2026-09-30");
    expect(businessDate("2026-10-01T03:00:00Z", "America/Sao_Paulo")).toBe("2026-10-01");
  });
});
describe("ML eligibility and leakage safeguards", () => {
  const cases = reconcile([
    checkout(),
    checkout("open", "2026-10-09T15:00:00Z"),
    checkout("expired"),
  ]).cases;
  it("trains only mature labels, with no raw identity or future order features", () => {
    const rows = buildTrainingDataset(cases, "America/Sao_Paulo");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.label).sort()).toEqual([0, 1]);
    const f = extractRecoveryFeatures(cases[0], "America/Sao_Paulo")!;
    expect(f).not.toHaveProperty("recoveredOrder");
    expect(f).not.toHaveProperty("status");
    expect(f).not.toHaveProperty("email");
    expect(f).not.toHaveProperty("name");
    const changed = { ...cases[0], status: "EXPIRED", recoveredOrder: null } as RecoveryCase;
    expect(extractRecoveryFeatures(changed, "America/Sao_Paulo")).toEqual(f);
  });
  it("excludes snapshots and customer history captured after abandonment", () => {
    const bad = { ...cases[0], customer: { ...cases[0].customer, capturedAt: FIXTURE_AS_OF } };
    expect(extractRecoveryFeatures(bad, "America/Sao_Paulo")).toBeNull();
  });
  it("purges labels unavailable at the time-based training cutoff", () => {
    const rows = buildTrainingDataset(cases, "America/Sao_Paulo");
    const split = temporalTrainingSplit(rows, "2026-09-20T00:00:00Z");
    expect(split.training).toHaveLength(1);
    expect(split.training[0].label).toBe(1);
  });
  it("does not emit probability or expected ML revenue for learning/demo", () => {
    const provider = new LearningRecoveryModelProvider(),
      rows = buildTrainingDataset(cases, "America/Sao_Paulo"),
      status = provider.describe(rows, "demo");
    expect(status.status).toBe("LEARNING");
    expect(status.minimumMature).toBe(RECOVERY_RULES.minimumMatureCases);
    expect(
      calibratedPrediction(
        provider,
        extractRecoveryFeatures(cases[1], "America/Sao_Paulo"),
        status,
      ),
    ).toBeNull();
    const a = analyzeRecovery(cases, query, "America/Sao_Paulo", "demo");
    expect(a.summary.expectedRecoverableCents).toBeNull();
    expect(a.predictionDistribution).toBeNull();
    const opportunities = recoveryOpportunities(
      cases,
      query,
      "America/Sao_Paulo",
      FIXTURE_AS_OF,
      status,
    );
    expect(opportunities[0].probability).toBeNull();
    expect(opportunities[0].historicalEstimateCents).toBeNull();
    expect(opportunities[0].priority).toBe("VALUE");
  });
});
