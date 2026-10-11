import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/api", () => ({ api: { get: vi.fn() } }));
import { recoveryRange, recoveryQuery, DEFAULT_RECOVERY_FILTERS } from "./recovery-service";
import { recoveryMoney, recoveryComparison, recoveryHours } from "./recovery-format";
describe("Recovery presentation boundary", () => {
  it("uses the business day rather than naive browser-local dates", () => {
    expect(
      recoveryRange({ mode: "preset", preset: "30d" }, new Date("2026-10-01T02:59:00Z")),
    ).toEqual({ startDate: "2026-09-01", endDate: "2026-09-30" });
  });
  it("drops ALL values and keeps independent status, method and cohort filters", () => {
    expect(recoveryQuery(DEFAULT_RECOVERY_FILTERS)).not.toHaveProperty("method");
    const q = recoveryQuery({
      ...DEFAULT_RECOVERY_FILTERS,
      period: { mode: "custom", startDate: "2026-09-01", endDate: "2026-09-30" },
      status: "RECOVERED",
      method: "UNKNOWN",
      channel: "WHATSAPP",
    });
    expect(q).toMatchObject({
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      status: "RECOVERED",
      method: "UNKNOWN",
      channel: "WHATSAPP",
    });
  });
  it("rejects invalid custom periods", () =>
    expect(() =>
      recoveryRange({ mode: "custom", startDate: "2026-02-30", endDate: "2026-03-01" }),
    ).toThrow());
  it("formats cents only at the presentation boundary and preserves unknown values", () => {
    expect(recoveryMoney(10001)).toContain("100,01");
    expect(recoveryMoney(null)).toBe("—");
    expect(recoveryHours(null)).toBe("—");
    expect(recoveryComparison(100, 0)).toBeNull();
    expect(recoveryComparison(null, 10)).toBeNull();
    expect(recoveryComparison(40, 30, true)).toBe(10);
  });
});
