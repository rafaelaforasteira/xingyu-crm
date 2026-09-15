import { enrichMockOverview } from "./sales-overview-mock";
import { getSalesTrackingMock } from "./sales-tracking-mock";
import type {
  SalesTrackingData,
  TrackingDateRange,
  TrackingFilters,
  TrackingPeriod,
} from "./sales-tracking-types";

export function resolveTrackingDateRange(
  period: TrackingDateRange,
  today = new Date(),
): { startDate: string; endDate: string } {
  if (period.mode === "custom") {
    return { startDate: period.startDate, endDate: period.endDate };
  }

  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  if (period.preset === "12m") start.setFullYear(start.getFullYear() - 1);
  else start.setDate(start.getDate() - (period.preset === "90d" ? 89 : 29));
  const toIsoDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

function mockPeriodFor(period: TrackingDateRange): TrackingPeriod {
  if (period.mode === "preset") return period.preset;
  const start = new Date(`${period.startDate}T00:00:00`);
  const end = new Date(`${period.endDate}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  if (days <= 45) return "30d";
  if (days <= 180) return "90d";
  return "12m";
}

/**
 * Boundary for the future Tracking API. Shopify payloads must be normalized into
 * SalesTrackingData before reaching the UI; raw orders never belong in components.
 */
export async function getSalesTrackingData(filters: TrackingFilters): Promise<SalesTrackingData> {
  await new Promise((resolve) => setTimeout(resolve, 220));
  // The custom range already resolves to API-ready ISO dates. While this screen
  // uses fixtures, its span deterministically selects the closest mock dataset.
  const range = resolveTrackingDateRange(filters.period);
  const data = getSalesTrackingMock(mockPeriodFor(filters.period));
  const customerFactor =
    filters.customerType === "NEW"
      ? data.overview.firstPurchaseRevenuePercentage / 100
      : filters.customerType === "EXISTING"
        ? data.overview.repeatRevenuePercentage / 100
        : filters.customerType === "REACTIVATED"
          ? data.overview.reactivatedCustomersPercentage / 100
          : 1;
  const selectedStage = data.purchaseStages.find((stage) =>
    filters.purchaseStage === "6+"
      ? stage.stage === "6ª+"
      : stage.stage.startsWith(`${filters.purchaseStage}ª`),
  );
  const stageFactor =
    filters.purchaseStage === "ALL"
      ? 1
      : Math.max(0, (selectedStage?.revenue ?? 0) / data.summary.periodRevenue);
  const scopeFactor = customerFactor * stageFactor;
  const scoped = (value: number) => Math.round(value * scopeFactor);
  const paidOrders = scoped(data.overview.paidOrders);
  const buyers = scoped(data.overview.buyers);
  const onlyFirstPurchase = filters.customerType === "NEW" || filters.purchaseStage === "1";
  const onlyRepeatPurchase =
    filters.customerType === "EXISTING" ||
    filters.customerType === "REACTIVATED" ||
    (filters.purchaseStage !== "ALL" && filters.purchaseStage !== "1");
  const netSales = scoped(data.overview.netSales);
  const firstPurchaseRevenue = onlyFirstPurchase
    ? netSales
    : onlyRepeatPurchase
      ? 0
      : scoped(data.overview.firstPurchaseRevenue);
  const repeatRevenue = netSales - firstPurchaseRevenue;
  const overview = {
    ...data.overview,
    grossSales: netSales + scoped(data.overview.cancellations) + scoped(data.overview.refunds),
    cancellations: scoped(data.overview.cancellations),
    refunds: scoped(data.overview.refunds),
    netSales,
    paidOrders,
    buyers,
    averageTicket: paidOrders ? netSales / paidOrders : 0,
    averageLtv:
      data.overview.averageLtv *
      (filters.customerType === "NEW"
        ? 0.62
        : filters.customerType === "REACTIVATED"
          ? 1.21
          : filters.customerType === "EXISTING"
            ? 1.12
            : 1),
    repeatRevenue,
    repeatRevenuePercentage: netSales ? (repeatRevenue / netSales) * 100 : 0,
    firstPurchaseRevenue,
    firstPurchaseRevenuePercentage: netSales ? (firstPurchaseRevenue / netSales) * 100 : 0,
    reactivatedCustomers:
      filters.customerType === "NEW" ? 0 : scoped(data.overview.reactivatedCustomers),
    timeline: data.overview.timeline.map((point) => ({
      ...point,
      grossSales: scoped(point.grossSales),
      netSales: scoped(point.netSales),
      paidOrders: scoped(point.paidOrders),
    })),
  };
  overview.realizationRate = overview.grossSales
    ? (overview.netSales / overview.grossSales) * 100
    : null;
  overview.reactivatedCustomersPercentage = overview.buyers
    ? (overview.reactivatedCustomers / overview.buyers) * 100
    : 0;
  return {
    ...data,
    overview: enrichMockOverview(
      overview,
      range,
      scoped(data.overview.financialFlow.recoverableAmount ?? 0),
    ),
    customers: data.customers.filter((customer) => {
      const typeMatches =
        filters.customerType === "ALL" ||
        (filters.customerType === "NEW" && customer.customerStatus === "NEW") ||
        (filters.customerType === "REACTIVATED" && customer.customerStatus === "REACTIVATED") ||
        (filters.customerType === "EXISTING" && customer.customerStatus !== "NEW");
      const stageMatches =
        filters.purchaseStage === "ALL" ||
        (filters.purchaseStage === "6+"
          ? customer.purchaseStage >= 6
          : customer.purchaseStage === Number(filters.purchaseStage));
      return typeMatches && stageMatches;
    }),
  };
}
