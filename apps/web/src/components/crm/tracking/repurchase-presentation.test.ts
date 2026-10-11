import { describe, expect, it } from "vitest";
import { lateRepurchaseShare } from "./repurchase-presentation";

const bucket = (minDays: number, maxDays: number | null, percentage: number, customers = 1) =>
  ({ label: "faixa", minDays, maxDays, percentage, customers, revenue: 0 });

describe("late repurchase share", () => {
  it("reads the open-ended bucket independently of rank or label", () => {
    expect(lateRepurchaseShare([bucket(91, 180, 70), bucket(181, null, 12.9)])).toBe(12.9);
  });
  it("preserves a real zero share", () => {
    expect(lateRepurchaseShare([bucket(0, 30, 100), bucket(181, null, 0, 0)])).toBe(0);
  });
  it("leaves missing or empty data unavailable", () => {
    expect(lateRepurchaseShare([])).toBeNull();
    expect(lateRepurchaseShare([bucket(181, null, 0, 0)])).toBeNull();
    expect(lateRepurchaseShare([bucket(91, 180, 100)])).toBeNull();
  });
});
