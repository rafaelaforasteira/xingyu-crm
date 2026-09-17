import { SALES_INTELLIGENCE_DEMO } from "./sales-intelligence-mock";
import type { SalesTrackingData } from "./sales-tracking-types";

/** Presentation adapter only: cohort rates are supplied by analytics, never inferred from revenue. */
export function salesIntelligenceModel(data: SalesTrackingData) {
  return {
    averageLtv: data.overview.averageLtv,
    repeatCustomerRate:
      data.source === "mock"
        ? SALES_INTELLIGENCE_DEMO.repeatCustomerRate
        : {
            rate: data.repeatCustomerRate,
            // The current analytics contract has not defined a repeat-customer cohort.
            eligibleCustomers: null,
            repeatCustomers: null,
            observationWindowDays: null,
          },
    averageRepurchaseDays: data.overview.averageRepurchaseDays,
    reactivation: data.reactivation,
    paidOrders: data.overview.paidOrders,
    buyers: data.overview.buyers,
    averageTicket: data.overview.averageTicket,
    isDemonstrative: data.source === "mock",
    trends: {
      ...data.overview.trends,
      repeatCustomerRate:
        data.source === "mock" ? SALES_INTELLIGENCE_DEMO.repeatCustomerTrend : null,
      reactivatedCustomers:
        data.source === "mock"
          ? SALES_INTELLIGENCE_DEMO.reactivatedCustomersTrend
          : data.overview.trends.reactivatedCustomers,
    },
  };
}
