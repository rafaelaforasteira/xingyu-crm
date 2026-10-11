import { compositionMethod, recoveryComposition } from "./recovery-composition";
import { checkout, paidOrder, FIXTURE_AS_OF } from "./recovery-fixtures";
import { reconcileRecovery } from "./recovery-matching";
import type { RecoveryCase, RecoverySignal } from "@xingyu/types";
const signal = (method: RecoverySignal["method"], verified = true): RecoverySignal => ({
  kind: "ACTOR_METADATA",
  method,
  verified,
  evidence: "Verified fixture intervention",
});
function mixed(signals: RecoverySignal[], id = "case-1"): RecoveryCase {
  const c = reconcileRecovery(
    [checkout(id)],
    [paidOrder("order-" + id, { checkoutId: id, signals })],
    "org-a",
    FIXTURE_AS_OF,
  ).cases[0]!;
  return { ...c, attribution: { ...c.attribution, method: "MIXED" } };
}
describe("Three-category Recovery composition", () => {
  it("projects joint recovery with verified human intervention to CONSULTANT", () =>
    expect(compositionMethod(mixed([signal("AUTOMATIC"), signal("CONSULTANT")]))).toBe(
      "CONSULTANT",
    ));
  it("projects automatic evidence without verified human intervention to AUTOMATIC", () =>
    expect(compositionMethod(mixed([signal("CONSULTANT", false), signal("AUTOMATIC")]))).toBe(
      "AUTOMATIC",
    ));
  it("retains unknown when no valid evidence exists", () => {
    expect(compositionMethod(mixed([]))).toBe("UNKNOWN");
    expect(compositionMethod(mixed([signal("MIXED")]))).toBe("UNKNOWN");
    expect(compositionMethod(mixed([{ ...signal("CONSULTANT"), evidence: " " }]))).toBe("UNKNOWN");
  });
  it("accepts verified actor identity on an explicit joint intervention", () => {
    expect(
      compositionMethod(
        mixed([{ ...signal("MIXED"), consultantId: "actor-1", automationId: "auto-1" }]),
      ),
    ).toBe("CONSULTANT");
    expect(compositionMethod(mixed([{ ...signal("MIXED"), automationId: "auto-1" }]))).toBe(
      "AUTOMATIC",
    );
  });
  it("reconciles every order, every cent and revenue shares without a visual MIXED category", () => {
    const cases = [
      mixed([signal("AUTOMATIC"), signal("CONSULTANT")], "human"),
      mixed([signal("AUTOMATIC")], "auto"),
      mixed([], "unknown"),
    ];
    const rows = recoveryComposition(cases);
    expect(rows.map((r) => r.method)).toEqual(["AUTOMATIC", "CONSULTANT", "UNKNOWN"]);
    expect(rows.map((r) => r.cases)).toEqual([1, 1, 1]);
    expect(rows.reduce((n, r) => n + r.cases, 0)).toBe(cases.length);
    expect(rows.reduce((n, r) => n + r.revenueCents, 0)).toBe(
      cases.reduce((n, c) => n + c.recoveredOrder!.netCents, 0),
    );
    expect(rows.reduce((n, r) => n + (r.revenueShare ?? 0), 0)).toBeCloseTo(100);
    expect(cases.every((c) => c.attribution.method === "MIXED")).toBe(true);
  });
  it("rejects double counting a recovered order", () => {
    const c = mixed([]);
    expect(() => recoveryComposition([c, c])).toThrow("Duplicate recovered order");
  });
  it("keeps zero-denominator shares unavailable", () =>
    expect(
      recoveryComposition([]).every(
        (r) => r.cases === 0 && r.revenueCents === 0 && r.revenueShare === null,
      ),
    ).toBe(true));
});
