import { safeRate } from "./financial-flow";
import type { FinancialFlowData } from "./sales-tracking-types";

const compactThousands = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const compactMillions = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 2,
});

/** Local precision for funnel labels; chart formatters elsewhere remain unchanged. */
export function formatFunnelMoney(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return (Math.abs(value) >= 1_000_000 ? compactMillions : compactThousands).format(value);
}

export function realizationComparison(
  flow: Pick<FinancialFlowData, "realizationRate" | "previousPeriod">,
) {
  const previousRate = safeRate(flow.previousPeriod.netSales, flow.previousPeriod.grossSales);
  const delta =
    flow.realizationRate == null || previousRate == null
      ? null
      : flow.realizationRate - previousRate;
  return { previousRate, delta };
}

export function percentagePoints(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "Sem base de comparação";
  // Avoid displaying a signed zero after rounding.
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${Object.is(rounded, -0) ? "0,0" : rounded.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} p.p.`;
}
