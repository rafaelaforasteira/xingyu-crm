import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { FinancialSnapshot, SalesComparison, SalesOverview } from "./sales-tracking-types";
import { financialFlow, overviewTrends, previousEqualPeriod } from "./financial-flow";

/** Explicit demonstration data, never inferred as real recovery or Shopify data. */
export function enrichMockOverview(
  overview: Omit<SalesOverview, "financialFlow">,
  range: { startDate: string; endDate: string },
  recoverableAmount: number,
): SalesOverview {
  const previousNet = Math.round(overview.netSales / 1.087);
  const previousCancellations = Math.round(overview.cancellations / 0.979);
  const previousRefunds = Math.round(overview.refunds / 1.034);
  const previous: SalesComparison = {
    ...previousEqualPeriod(range),
    grossSales: previousNet + previousCancellations + previousRefunds,
    cancellations: previousCancellations,
    refunds: previousRefunds,
    netSales: previousNet,
    recoverableAmount: null,
    recoveredAmount: null,
    averageLtv: overview.averageLtv / 1.048,
    averageRepurchaseDays: overview.averageRepurchaseDays + 6,
    repeatRevenue: overview.repeatRevenue / 1.032,
    reactivatedCustomers: overview.reactivatedCustomers / 1.114,
  };
  const current: FinancialSnapshot = {
    grossSales: overview.grossSales,
    cancellations: overview.cancellations,
    refunds: overview.refunds,
    netSales: overview.netSales,
    recoverableAmount,
    recoveredAmount: 0,
  };
  const duration = differenceInCalendarDays(parseISO(range.endDate), parseISO(range.startDate));
  const count = Math.min(overview.timeline.length, duration + 1);
  const weights = overview.timeline.slice(0, count);
  const total = weights.reduce((sum, point) => sum + point.grossSales, 0);
  const netTotal = weights.reduce((sum, point) => sum + point.netSales, 0);
  const ordersTotal = weights.reduce((sum, point) => sum + point.paidOrders, 0);
  let grossAllocated = 0,
    netAllocated = 0,
    ordersAllocated = 0;
  const timeline = weights.map((point, index) => {
    const last = index === count - 1;
    const fraction = total ? point.grossSales / total : 0;
    const grossSales = last
      ? overview.grossSales - grossAllocated
      : Math.round(overview.grossSales * fraction);
    const netSales = last
      ? overview.netSales - netAllocated
      : Math.round(overview.netSales * (netTotal ? point.netSales / netTotal : 0));
    const paidOrders = last
      ? overview.paidOrders - ordersAllocated
      : Math.round(overview.paidOrders * (ordersTotal ? point.paidOrders / ordersTotal : 0));
    grossAllocated += grossSales;
    netAllocated += netSales;
    ordersAllocated += paidOrders;
    const date = addDays(
      parseISO(range.startDate),
      count === 1 ? 0 : Math.round((index * duration) / (count - 1)),
    );
    return {
      date: format(date, "yyyy-MM-dd"),
      label: format(date, "dd/MM"),
      grossSales,
      netSales,
      paidOrders,
    };
  });
  return {
    ...overview,
    financialFlow: financialFlow(current, previous),
    trends: overviewTrends(overview, previous),
    timeline,
  };
}
