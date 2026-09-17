import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type {
  FinancialFlowData,
  FinancialSnapshot,
  SalesComparison,
  SalesOverview,
  Trend,
} from "./sales-tracking-types";

export function safeRate(value: number, base: number): number | null {
  return base > 0 && Number.isFinite(base) && Number.isFinite(value) ? (value / base) * 100 : null;
}

export function previousEqualPeriod(range: { startDate: string; endDate: string }) {
  const start = parseISO(range.startDate);
  const days = differenceInCalendarDays(parseISO(range.endDate), start) + 1;
  return {
    startDate: format(addDays(start, -days), "yyyy-MM-dd"),
    endDate: format(addDays(start, -1), "yyyy-MM-dd"),
  };
}

export function metricTrend(
  current: number | null,
  previous: number | null,
  lowerIsBetter = false,
  suffix: "%" | "dias" = "%",
): Trend | null {
  if (current == null || previous == null) return null;
  const delta = suffix === "dias" ? current - previous : safeRate(current - previous, previous);
  if (delta == null || !Number.isFinite(delta)) return null;
  return {
    direction: delta === 0 ? "flat" : delta > 0 ? "up" : "down",
    value: Math.abs(delta),
    suffix,
    sentiment: delta === 0 ? "neutral" : delta < 0 === lowerIsBetter ? "positive" : "negative",
  };
}

export function financialFlow(
  current: FinancialSnapshot,
  previousPeriod: SalesComparison,
): FinancialFlowData {
  const afterCancellations = current.grossSales - current.cancellations;
  const afterRefunds = afterCancellations - current.refunds;
  // Recovery is a FAROL metric, not an automatic Shopify field. Pending recovery
  // never adds revenue. netSales is authoritative from normalization; even a
  // confirmed recoveredAmount is NOT added again here (it may already be included).
  return {
    ...current,
    afterCancellations,
    afterRefunds,
    cancellationsRate: safeRate(current.cancellations, current.grossSales),
    refundsRate: safeRate(current.refunds, current.grossSales),
    grossToAfterCancellationRate: safeRate(afterCancellations, current.grossSales),
    afterCancellationToAfterRefundRate: safeRate(afterRefunds, afterCancellations),
    realizationRate: safeRate(current.netSales, current.grossSales),
    recoveryRate:
      current.recoveredAmount == null || current.recoverableAmount == null
        ? null
        : safeRate(current.recoveredAmount, current.recoverableAmount),
    recoverableLossRate:
      current.recoverableAmount == null
        ? null
        : safeRate(current.recoverableAmount, current.cancellations + current.refunds),
    previousPeriod,
    trends: {
      grossSales: metricTrend(current.grossSales, previousPeriod.grossSales),
      cancellations: metricTrend(current.cancellations, previousPeriod.cancellations, true),
      refunds: metricTrend(current.refunds, previousPeriod.refunds, true),
      netSales: metricTrend(current.netSales, previousPeriod.netSales),
    },
  };
}

export function overviewTrends(
  current: Pick<
    SalesOverview,
    "netSales" | "averageLtv" | "averageRepurchaseDays" | "repeatRevenue" | "reactivatedCustomers"
  >,
  previous: SalesComparison,
): SalesOverview["trends"] {
  return {
    netSales: metricTrend(current.netSales, previous.netSales),
    averageLtv: metricTrend(current.averageLtv, previous.averageLtv),
    averageRepurchaseDays: metricTrend(
      current.averageRepurchaseDays,
      previous.averageRepurchaseDays,
      true,
      "dias",
    ),
    repeatRevenue: metricTrend(current.repeatRevenue, previous.repeatRevenue),
    reactivatedCustomers: metricTrend(current.reactivatedCustomers, previous.reactivatedCustomers),
  };
}
