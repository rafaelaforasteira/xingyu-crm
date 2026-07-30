import { computeRepurchaseScore } from "./repurchase.service";

describe("computeRepurchaseScore", () => {
  it("scores recurring inactive customers highly", () => {
    const result = computeRepurchaseScore({
      daysSinceOrder: 90,
      orderCount: 4,
      totalPurchased: 5000,
      averageTicket: 1250,
    });
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.predictedValue).toBe(1250);
    expect(result.reason).toContain("recorrente");
  });

  it("keeps first-purchase window reason", () => {
    const result = computeRepurchaseScore({
      daysSinceOrder: 70,
      orderCount: 1,
      totalPurchased: 200,
      averageTicket: 200,
    });
    expect(result.reason).toContain("Primeira compra");
  });
});
