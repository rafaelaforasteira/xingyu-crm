import {
  DASHBOARD_REPURCHASE_READY_MAX_DAYS,
  DASHBOARD_REPURCHASE_READY_MIN_DAYS,
  isRepurchaseReady,
  repurchaseReadyDescription,
  resolveRepurchaseBand,
} from "./repurchase-bands";

describe("repurchase bands", () => {
  it("resolves each configured band", () => {
    expect(resolveRepurchaseBand(10)?.id).toBe("0_30");
    expect(resolveRepurchaseBand(45)?.id).toBe("31_60");
    expect(resolveRepurchaseBand(75)?.id).toBe("61_90");
    expect(resolveRepurchaseBand(100)?.id).toBe("91_120");
    expect(resolveRepurchaseBand(150)?.id).toBe("120_plus");
  });

  it("marks dashboard-ready contacts in the 30–90 window with orders", () => {
    expect(isRepurchaseReady(30, 2)).toBe(true);
    expect(isRepurchaseReady(90, 1)).toBe(true);
    expect(isRepurchaseReady(29, 3)).toBe(false);
    expect(isRepurchaseReady(91, 3)).toBe(false);
    expect(isRepurchaseReady(45, 0)).toBe(false);
  });

  it("documents included bands for the dashboard indicator", () => {
    expect(DASHBOARD_REPURCHASE_READY_MIN_DAYS).toBe(30);
    expect(DASHBOARD_REPURCHASE_READY_MAX_DAYS).toBe(90);
    expect(repurchaseReadyDescription()).toContain("31 a 60 dias");
    expect(repurchaseReadyDescription()).toContain("61 a 90 dias");
  });
});
