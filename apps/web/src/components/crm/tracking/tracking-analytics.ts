import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { financialFlow, overviewTrends, previousEqualPeriod, safeRate } from "./financial-flow";
import { REACTIVATION_DAYS, FIRST_TO_SECOND_WINDOW_DAYS } from "./sales-tracking-rules";
import { overviewChannel } from "./tracking-dictionary";
import { timelineGranularity } from "./tracking-dates";
import type {
  ResolvedTrackingRange,
  TrackingDataset,
  TrackingOrder,
} from "./tracking-analytics-types";
import type {
  SalesComparison,
  SalesTrackingData,
  TrackedCustomer,
  TrackingFilters,
} from "./sales-tracking-types";

const sum = <T>(rows: T[], value: (row: T) => number) =>
  rows.reduce((total, row) => total + value(row), 0);
const average = (values: number[]) =>
  values.length ? sum(values, (n) => n) / values.length : null;
const daysBetween = (from: string, to: string) =>
  differenceInCalendarDays(parseISO(to), parseISO(from));
const inRange = (date: string, range: ResolvedTrackingRange) =>
  date >= range.startDate && date <= range.endDate;
const stageMatches = (stage: number, filter: TrackingFilters["purchaseStage"]) =>
  filter === "ALL" || (filter === "6+" ? stage >= 6 : stage === Number(filter));
const centsToMoney = (cents: number) => cents / 100;

/** Adjustments after the reporting cutoff must never leak into a historical snapshot. */
export function orderAsOf(order: TrackingOrder, asOfDate: string) {
  const adjustments = order.adjustments.filter((event) => event.date <= asOfDate);
  const cancellations = sum(
    adjustments.filter((event) => event.kind === "CANCELLATION"),
    (event) => event.cents,
  );
  const refunds = sum(
    adjustments.filter((event) => event.kind === "REFUND"),
    (event) => event.cents,
  );
  if (
    !Number.isSafeInteger(order.grossCents) ||
    order.grossCents < 0 ||
    adjustments.some((event) => !Number.isSafeInteger(event.cents) || event.cents < 0) ||
    cancellations + refunds > order.grossCents
  )
    throw new Error("Pedido com valores financeiros inconsistentes.");
  // This adapter accepts finalized sales only: unpaid orders must have their gross
  // fully cancelled. Open receivables need a separate future normalization policy.
  const net = order.grossCents - cancellations - refunds;
  const valid = !!order.paidAt && order.paidAt <= asOfDate && order.date <= asOfDate && net > 0;
  if (order.date <= asOfDate && net > 0 && !valid)
    throw new Error("Venda pendente requer normalização financeira.");
  return { ...order, cancellations, refunds, net, valid };
}
type SnapshotOrder = ReturnType<typeof orderAsOf>;
type IndexedOrder = SnapshotOrder & { ordinal: number; previousDate: string | null };

function aggregate(
  dataset: TrackingDataset,
  filters: TrackingFilters,
  range: ResolvedTrackingRange,
) {
  const histories = new Map<string, IndexedOrder[]>();
  const all = new Map<string, IndexedOrder[]>();
  const ordered = dataset.orders
    .filter((order) => order.date <= range.endDate)
    .map((order) => orderAsOf(order, range.endDate))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  for (const order of ordered) {
    if (seen.has(order.id)) throw new Error("Pedido duplicado.");
    seen.add(order.id);
    const history = histories.get(order.customerId) ?? [];
    const indexed = {
      ...order,
      ordinal: history.length + 1,
      previousDate: history.at(-1)?.date ?? null,
    };
    if (order.valid) history.push(indexed);
    histories.set(order.customerId, history);
    all.set(order.customerId, [...(all.get(order.customerId) ?? []), indexed]);
  }
  const selected: IndexedOrder[] = [];
  const customers: TrackedCustomer[] = [];
  const historicalGaps: number[] = [];
  const firstToSecondGaps: number[] = [];
  const bucketCustomers: Array<{ days: number; revenue: number }> = [];
  const eligible = new Set<string>();
  const reactivated = new Set<string>();
  const inactivity: number[] = [];
  let firstRevenue = 0,
    newRevenue = 0,
    reactivatedRevenue = 0;

  for (const identity of dataset.customers) {
    const history = histories.get(identity.id) ?? [];
    const first = history[0]?.date;
    const acquisitionType = first && first < range.startDate ? "EXISTING" : "NEW";
    const periodHistory = history.filter((order) => inRange(order.date, range));
    const reactivationEvents =
      acquisitionType === "EXISTING"
        ? periodHistory.filter(
            (order) =>
              order.previousDate &&
              daysBetween(order.previousDate, order.date) >= REACTIVATION_DAYS,
          )
        : [];
    // Eligibility is evaluated independently of successful return. A customer
    // qualifies once a gap reaches the threshold during this window (or earlier).
    if (acquisitionType === "EXISTING" && filters.customerType !== "NEW") {
      history.forEach((order, index) => {
        const next = history[index + 1];
        const threshold = format(addDays(parseISO(order.date), REACTIVATION_DAYS), "yyyy-MM-dd");
        if (
          threshold <= range.endDate &&
          (!next || next.date >= range.startDate) &&
          (!next || next.date >= threshold)
        )
          eligible.add(identity.id);
      });
    }
    const isReactivated = reactivationEvents.length > 0;
    const matchesType =
      filters.customerType === "ALL" ||
      (!!first && filters.customerType === acquisitionType) ||
      (filters.customerType === "REACTIVATED" && isReactivated);
    if (!matchesType) continue;
    const scoped = (all.get(identity.id) ?? []).filter(
      (order) => inRange(order.date, range) && stageMatches(order.ordinal, filters.purchaseStage),
    );
    selected.push(...scoped);
    const valid = scoped.filter((order) => order.valid);
    if (!valid.length) continue;
    const net = sum(valid, (order) => order.net);
    firstRevenue += sum(
      valid.filter((order) => order.ordinal === 1),
      (order) => order.net,
    );
    if (acquisitionType === "NEW") newRevenue += net;
    // Reactivated is an event on the buyer, not an exclusive purchase number.
    if (isReactivated) {
      reactivated.add(identity.id);
      inactivity.push(
        daysBetween(reactivationEvents[0]!.previousDate!, reactivationEvents[0]!.date),
      );
      reactivatedRevenue += net;
    }
    const gaps = history
      .slice(1)
      .map((order, index) => daysBetween(history[index]!.date, order.date));
    historicalGaps.push(...gaps);
    if (history.length > 1) firstToSecondGaps.push(daysBetween(history[0]!.date, history[1]!.date));
    const repeats = valid.filter((order) => order.previousDate !== null);
    if (repeats.length) {
      // One bucket per buyer: last selected repeat interval, with all selected repeat revenue.
      const last = repeats.at(-1)!;
      bucketCustomers.push({
        days: daysBetween(last.previousDate!, last.date),
        revenue: sum(repeats, (order) => order.net),
      });
    }
    const last = history.at(-1)!;
    customers.push({
      ...identity,
      acquisitionType,
      isReactivated,
      periodOrders: valid.length,
      customerStatus:
        acquisitionType === "NEW" ? "NEW" : isReactivated ? "REACTIVATED" : "RECURRING",
      ordersCount: history.length,
      purchaseStage: valid.at(-1)!.ordinal,
      periodRevenue: centsToMoney(net),
      lifetimeValue: centsToMoney(sum(history, (order) => order.net)),
      lastPurchaseAt: last.date,
      daysSinceLastPurchase: daysBetween(last.date, range.endDate),
      averageDaysBetweenOrders: average(gaps),
      salesperson: identity.responsibleUser?.name ?? "Sem responsável",
    });
  }
  const paid = selected.filter((order) => order.valid);
  const grossCents = sum(selected, (order) => order.grossCents);
  const cancellationCents = sum(selected, (order) => order.cancellations);
  const refundCents = sum(selected, (order) => order.refunds);
  const netCents = sum(selected, (order) => order.net);
  const financial = {
    grossSales: centsToMoney(grossCents),
    cancellations: centsToMoney(cancellationCents),
    refunds: centsToMoney(refundCents),
    netSales: centsToMoney(netCents),
    recoverableAmount: centsToMoney(
      sum(selected, (order) =>
        order.recovery && order.recovery.date <= range.endDate ? order.recovery.pendingCents : 0,
      ),
    ),
    recoveredAmount: centsToMoney(
      sum(selected, (order) =>
        order.recovery && order.recovery.date <= range.endDate ? order.recovery.recoveredCents : 0,
      ),
    ),
  };
  const repeatRevenue = centsToMoney(netCents - firstRevenue);
  const summary = {
    periodRevenue: financial.netSales,
    ordersCount: paid.length,
    buyersCount: customers.length,
    averageTicket: paid.length ? financial.netSales / paid.length : null,
    averageLtv: average(customers.map((customer) => customer.lifetimeValue)),
    averageRepurchaseDays: average(historicalGaps),
    medianRepurchaseDays: median(historicalGaps),
    firstToSecondPurchaseDays: average(firstToSecondGaps),
    newCustomers: customers.filter((customer) => customer.acquisitionType === "NEW").length,
    existingCustomers: customers.filter((customer) => customer.acquisitionType === "EXISTING")
      .length,
    reactivatedCustomers: reactivated.size,
    reactivatedRevenue: centsToMoney(reactivatedRevenue),
    reactivatedAverageLtv: average(
      customers
        .filter((customer) => reactivated.has(customer.id))
        .map((customer) => customer.lifetimeValue),
    ),
    reactivatedAverageInactiveDays: average(inactivity),
    newRevenue: centsToMoney(newRevenue),
    existingRevenue: centsToMoney(netCents - newRevenue),
    newRevenuePercentage: safeRate(newRevenue, netCents),
    existingRevenuePercentage: safeRate(netCents - newRevenue, netCents),
    repeatRevenue,
    repeatRevenuePercentage: safeRate(netCents - firstRevenue, netCents),
  };
  const granularity = timelineGranularity(range);
  const timeline: SalesTrackingData["overview"]["timeline"] = [];
  let cursor = range.startDate;
  while (cursor <= range.endDate) {
    const date = parseISO(cursor);
    const next =
      granularity === "month"
        ? format(new Date(date.getFullYear(), date.getMonth() + 1, 1), "yyyy-MM-dd")
        : format(addDays(date, granularity === "week" ? 7 : 1), "yyyy-MM-dd");
    const endDate = [format(addDays(parseISO(next), -1), "yyyy-MM-dd"), range.endDate].sort()[0]!;
    const rows = selected.filter((order) => order.date >= cursor && order.date <= endDate);
    const gross = sum(rows, (order) => order.grossCents),
      net = sum(rows, (order) => order.net);
    timeline.push({
      date: cursor,
      endDate,
      label: format(date, granularity === "month" ? "MM/yyyy" : "dd/MM"),
      grossSales: centsToMoney(gross),
      netSales: centsToMoney(net),
      paidOrders: rows.filter((order) => order.valid).length,
      realizationRate: safeRate(net, gross),
    });
    cursor = next;
  }
  const channels = Array.from(new Set(paid.map((order) => overviewChannel(order.attribution))))
    .map((channel) => {
      const rows = paid.filter((order) => overviewChannel(order.attribution) === channel);
      const revenue = sum(rows, (order) => order.net);
      const ids = new Set(rows.map((order) => order.customerId));
      return {
        channel,
        netRevenue: centsToMoney(revenue),
        revenueShare: safeRate(revenue, netCents),
        orders: rows.length,
        buyers: ids.size,
        newCustomers: customers.filter(
          (customer) => ids.has(customer.id) && customer.acquisitionType === "NEW",
        ).length,
        averageTicket: rows.length ? centsToMoney(revenue) / rows.length : null,
      };
    })
    .sort((a, b) => b.netRevenue - a.netRevenue);
  const unidentifiedCents = sum(
    paid.filter((order) => overviewChannel(order.attribution) === "UNIDENTIFIED"),
    (order) => order.net,
  );
  const purchaseStages = [1, 2, 3, 4, 5, 6].map((stage) => {
    const rows = paid.filter((order) =>
      stage === 6 ? order.ordinal >= 6 : order.ordinal === stage,
    );
    const revenue = sum(rows, (order) => order.net);
    return {
      stage: stage === 6 ? "6ª+" : stage + "ª",
      customers: new Set(rows.map((order) => order.customerId)).size,
      orders: rows.length,
      revenue: centsToMoney(revenue),
      percentage: safeRate(rows.length, paid.length) ?? 0,
      revenueShare: safeRate(revenue, netCents),
      averageTicket: rows.length ? centsToMoney(revenue) / rows.length : null,
    };
  });
  const repurchaseBuckets = [
    { label: "Até 30 dias", minDays: 0, maxDays: 30 },
    { label: "31–60 dias", minDays: 31, maxDays: 60 },
    { label: "61–90 dias", minDays: 61, maxDays: 90 },
    { label: "91–180 dias", minDays: 91, maxDays: 180 },
    { label: "180+ dias", minDays: 181, maxDays: null },
  ].map((bucket) => {
    const rows = bucketCustomers.filter(
      (row) => row.days >= bucket.minDays && (bucket.maxDays == null || row.days <= bucket.maxDays),
    );
    return {
      ...bucket,
      customers: rows.length,
      percentage: safeRate(rows.length, bucketCustomers.length) ?? 0,
      revenue: centsToMoney(sum(rows, (row) => row.revenue)),
    };
  });
  const ltv: SalesTrackingData["ltv"] = [
    {
      key: "new",
      label: "Novos",
      value: average(
        customers
          .filter((customer) => customer.acquisitionType === "NEW")
          .map((customer) => customer.lifetimeValue),
      ),
    },
    {
      key: "existing",
      label: "Base existente",
      value: average(
        customers
          .filter((customer) => customer.acquisitionType === "EXISTING")
          .map((customer) => customer.lifetimeValue),
      ),
    },
    {
      key: "reactivated",
      label: "Reativados",
      value: average(
        customers
          .filter((customer) => customer.isReactivated)
          .map((customer) => customer.lifetimeValue),
      ),
    },
  ];
  // Fully observed acquisition cohort; no denominator based on monthly buyers.
  const observationWindowDays = FIRST_TO_SECOND_WINDOW_DAYS;
  const cohort = [...histories.values()].filter(
    (history) =>
      history.length &&
      inRange(history[0]!.date, range) &&
      daysBetween(history[0]!.date, range.endDate) >= observationWindowDays,
  );
  const converted = cohort.filter(
    (history) =>
      history.length > 1 &&
      daysBetween(history[0]!.date, history[1]!.date) <= observationWindowDays,
  ).length;
  return {
    financial,
    summary,
    customers,
    firstPurchaseRevenue: centsToMoney(firstRevenue),
    timeline,
    channels,
    purchaseStages,
    repurchaseBuckets,
    ltv,
    granularity,
    attribution: {
      attributedRevenue: centsToMoney(netCents - unidentifiedCents),
      attributedRevenueShare: safeRate(netCents - unidentifiedCents, netCents),
      unattributedRevenue: centsToMoney(unidentifiedCents),
      unattributedRevenueShare: safeRate(unidentifiedCents, netCents),
      totalNetRevenue: financial.netSales,
    },
    reactivation: {
      eligibleCustomers: filters.purchaseStage === "ALL" ? eligible.size : null,
      reactivatedCustomers: reactivated.size,
      reactivationRate:
        filters.purchaseStage === "ALL" ? safeRate(reactivated.size, eligible.size) : null,
      netRevenue: centsToMoney(reactivatedRevenue),
      averageInactivityDays: average(inactivity),
    },
    firstToSecondConversion:
      filters.customerType === "ALL" && filters.purchaseStage === "ALL"
        ? {
            rate: safeRate(converted, cohort.length),
            eligibleCustomers: cohort.length,
            convertedCustomers: converted,
            observationWindowDays,
          }
        : null,
  };
}
export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}
export function analyzeTrackingOverview(
  dataset: TrackingDataset,
  filters: TrackingFilters,
  range: ResolvedTrackingRange,
  source: SalesTrackingData["source"] = "api",
): SalesTrackingData {
  const current = aggregate(dataset, filters, range);
  const previousRange = previousEqualPeriod(range);
  const previous = aggregate(dataset, filters, previousRange);
  const previousPeriod: SalesComparison = {
    ...previous.financial,
    ...previousRange,
    averageLtv: previous.summary.averageLtv,
    averageRepurchaseDays: previous.summary.averageRepurchaseDays,
    repeatRevenue: previous.summary.repeatRevenue,
    reactivatedCustomers: previous.summary.reactivatedCustomers,
  };
  const flow = financialFlow(current.financial, previousPeriod);
  const overview = {
    ...current.financial,
    financialFlow: flow,
    realizationRate: flow.realizationRate,
    paidOrders: current.summary.ordersCount,
    buyers: current.summary.buyersCount,
    averageTicket: current.summary.averageTicket,
    averageLtv: current.summary.averageLtv,
    averageRepurchaseDays: current.summary.averageRepurchaseDays,
    repeatRevenue: current.summary.repeatRevenue,
    repeatRevenuePercentage: current.summary.repeatRevenuePercentage,
    firstPurchaseRevenue: current.firstPurchaseRevenue,
    firstPurchaseRevenuePercentage: safeRate(
      current.firstPurchaseRevenue,
      current.financial.netSales,
    ),
    reactivatedCustomers: current.summary.reactivatedCustomers,
    reactivatedCustomersPercentage: safeRate(
      current.summary.reactivatedCustomers,
      current.summary.buyersCount,
    ),
    timeline: current.timeline,
  };
  return {
    range,
    granularity: current.granularity,
    summary: current.summary,
    overview: { ...overview, trends: overviewTrends(overview, previousPeriod) },
    channels: current.channels,
    attribution: current.attribution,
    reactivation: current.reactivation,
    firstToSecondConversion: current.firstToSecondConversion,
    repeatCustomerRate: null,
    purchaseStages: current.purchaseStages,
    repurchaseBuckets: current.repurchaseBuckets,
    ltv: current.ltv,
    customers: current.customers,
    source,
    updatedAt: new Date().toISOString(),
  };
}
