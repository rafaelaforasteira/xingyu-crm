import { describe, expect, it } from "vitest";
import { calculateRepurchaseScore, formatCurrencyBRL } from "./index";

describe("calculateRepurchaseScore", () => {
  it("scores recent high-value buyers as HIGH", () => {
    const result = calculateRepurchaseScore({
      daysWithoutPurchase: 20,
      orderCount: 5,
      averageTicket: 800,
      totalPurchased: 5000,
    });
    expect(result.level).toBe("HIGH");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("scores long-inactive customers as LOW", () => {
    const result = calculateRepurchaseScore({
      daysWithoutPurchase: 200,
      orderCount: 1,
      averageTicket: 100,
      totalPurchased: 100,
    });
    expect(result.level).toBe("LOW");
  });
});

describe("formatCurrencyBRL", () => {
  it("formats BRL currency", () => {
    expect(formatCurrencyBRL(1500)).toContain("1.500");
  });
});
