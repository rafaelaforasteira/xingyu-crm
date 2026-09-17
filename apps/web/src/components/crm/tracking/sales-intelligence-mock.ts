import type { Trend } from "./sales-tracking-types";
export type IntelligenceTrend = Omit<Trend, "suffix"> & { suffix: Trend["suffix"] | "p.p." };
/** Visual demonstration only. Never applied to API data or other analytics sections. */
export const SALES_INTELLIGENCE_DEMO = {
  repeatCustomerRate: {
    rate: 38.4,
    eligibleCustomers: 250,
    repeatCustomers: 96,
    observationWindowDays: 60,
  },
  repeatCustomerTrend: {
    direction: "up",
    value: 4.2,
    suffix: "p.p.",
    sentiment: "positive",
  } satisfies IntelligenceTrend,
  reactivatedCustomersTrend: {
    direction: "up",
    value: 11.4,
    suffix: "%",
    sentiment: "positive",
  } satisfies IntelligenceTrend,
};
