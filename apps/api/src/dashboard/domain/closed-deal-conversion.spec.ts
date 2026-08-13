import { closedDealConversionDeltaPp, closedDealConversionRate } from "./closed-deal-conversion";

describe("closedDealConversionRate", () => {
  it("computes WON / (WON + LOST)", () => {
    expect(closedDealConversionRate(8, 2)).toBe(80);
    expect(closedDealConversionRate(1, 1)).toBe(50);
  });

  it("returns null when there are no closed deals", () => {
    expect(closedDealConversionRate(0, 0)).toBeNull();
  });

  it("ignores OPEN by never receiving them in the formula", () => {
    // OPEN would have been a third argument historically — must not affect rate.
    expect(closedDealConversionRate(3, 1)).toBe(75);
  });

  it("returns 100% when all closed deals are WON", () => {
    expect(closedDealConversionRate(5, 0)).toBe(100);
  });

  it("returns 0% only when there are closed deals and none were won", () => {
    expect(closedDealConversionRate(0, 4)).toBe(0);
  });
});

describe("closedDealConversionDeltaPp", () => {
  it("returns null when either side is unavailable", () => {
    expect(closedDealConversionDeltaPp(null, 40)).toBeNull();
    expect(closedDealConversionDeltaPp(40, null)).toBeNull();
  });

  it("returns percentage-point delta", () => {
    expect(closedDealConversionDeltaPp(50, 40)).toBe(10);
  });
});
