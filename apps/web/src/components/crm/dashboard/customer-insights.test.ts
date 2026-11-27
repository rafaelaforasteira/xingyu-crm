import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateTicketComparison,
  clampPercentage,
  CUSTOMERS_DEMO_DATA,
  getTicketInsight,
  safeShare,
} from "./customer-insights";

describe("customer insights", () => {
  const source = fs.readFileSync(path.join(__dirname, "customer-insights.tsx"), "utf8");

  it("calculates customer and revenue shares", () => {
    expect(safeShare(84, 212)).toBeCloseTo(39.6226, 3);
    expect(safeShare(36_480, 85_240)).toBeCloseTo(42.7968, 3);
  });

  it("protects percentage calculations against invalid bases", () => {
    expect(safeShare(10, 0)).toBe(0);
    expect(safeShare(Number.NaN, 10)).toBe(0);
    expect(safeShare(10, Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampPercentage(-10)).toBe(0);
    expect(clampPercentage(135)).toBe(100);
  });

  it("uses real revenue participation for every segment bar", () => {
    const total = CUSTOMERS_DEMO_DATA.tags.reduce((sum, tag) => sum + tag.revenue, 0);
    const shares = CUSTOMERS_DEMO_DATA.tags.map((tag) => safeShare(tag.revenue, total));
    expect(shares[0]).toBeCloseTo(35, 1);
    expect(shares[1]).toBeCloseTo(21.9, 1);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(100, 5);
    expect(source).not.toContain("maxRevenue");
    expect(source).toContain("const barWidth = clampPercentage(share)");
  });

  it("calculates and describes a higher recurring ticket", () => {
    const comparison = calculateTicketComparison(380.94, 434.29);
    expect(comparison?.difference).toBeCloseTo(53.35, 2);
    expect(comparison?.lift).toBeCloseTo(14, 1);
    expect(comparison?.direction).toBe("higher");
    expect(getTicketInsight(380.94, 434.29)).toContain("14,0% maior");
    expect(getTicketInsight(380.94, 434.29)).toContain("53,35");
  });

  it("describes lower, equal, and unavailable ticket comparisons", () => {
    expect(getTicketInsight(500, 400)).toContain("20,0% menor");
    expect(getTicketInsight(400, 400)).toContain("é equivalente");
    expect(getTicketInsight(0, 400)).toBe("Não há dados suficientes para comparar o ticket médio.");
    expect(getTicketInsight(null, 400)).toBe(
      "Não há dados suficientes para comparar o ticket médio.",
    );
  });

  it("provides all six demo KPIs and keeps segments ordered by revenue", () => {
    expect(CUSTOMERS_DEMO_DATA).toMatchObject({
      newCustomers: 128,
      recurringCustomers: 84,
      newRevenue: 48_760,
      recurringRevenue: 36_480,
      newTicket: 380.94,
      recurringTicket: 434.29,
    });
    expect(CUSTOMERS_DEMO_DATA.tags.map((tag) => tag.revenue)).toEqual(
      [...CUSTOMERS_DEMO_DATA.tags.map((tag) => tag.revenue)].sort((a, b) => b - a),
    );
  });

  it("includes accessible context, compact empty states, and reduced motion", () => {
    expect(source).toContain("Comportamento da base de clientes");
    expect(source).toContain("Ainda não há compras neste período");
    expect(source).toContain("Nenhuma tag associada aos compradores");
    expect(source).toContain("useReducedMotion");
    expect(source).toContain('href="/clients"');
    expect(source).toContain("Dados de demonstração");
    expect(source).toContain("min-h-[130px]");
  });
});
