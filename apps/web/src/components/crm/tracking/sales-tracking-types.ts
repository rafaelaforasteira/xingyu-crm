import type {
  AttributionCoverage,
  FirstToSecondConversion,
  ReactivationAnalytics,
  ResolvedTrackingRange,
  TrackingChannelRow,
} from "./tracking-analytics-types";
export type TrackingPeriod = "30d" | "90d" | "12m";
export type TrackingDateRange =
  | { mode: "preset"; preset: TrackingPeriod }
  | { mode: "custom"; startDate: string; endDate: string };
export type CustomerStatus = "NEW" | "RECURRING" | "REACTIVATED" | "AT_RISK" | "INACTIVE";

export type TrackingFilters = {
  period: TrackingDateRange;
  customerType: "ALL" | "NEW" | "EXISTING" | "REACTIVATED";
  purchaseStage: "ALL" | "1" | "2" | "3" | "4" | "5" | "6+";
};

export type PurchaseStageDistribution = {
  stage: string;
  customers: number;
  orders: number;
  revenue: number;
  percentage: number;
  revenueShare: number | null;
  averageTicket: number | null;
};

export type RepurchaseTimeBucket = {
  label: string;
  minDays: number;
  maxDays: number | null;
  customers: number;
  percentage: number;
  revenue: number;
};

export type TrackedCustomer = {
  id: string;
  crmProfileId?: string;
  acquisitionType: "NEW" | "EXISTING";
  isReactivated: boolean;
  periodOrders: number;
  name: string;
  email: string;
  phone: string;
  customerStatus: CustomerStatus;
  ordersCount: number;
  purchaseStage: number;
  periodRevenue: number;
  lifetimeValue: number;
  lastPurchaseAt: string;
  daysSinceLastPurchase: number;
  averageDaysBetweenOrders: number | null;
  salesperson: string;
};

export type SalesTrackingSummary = {
  periodRevenue: number;
  ordersCount: number;
  buyersCount: number;
  averageTicket: number | null;
  averageLtv: number | null;
  averageRepurchaseDays: number | null;
  medianRepurchaseDays: number | null;
  firstToSecondPurchaseDays: number | null;
  newCustomers: number;
  existingCustomers: number;
  reactivatedCustomers: number;
  reactivatedRevenue: number;
  reactivatedAverageLtv: number | null;
  reactivatedAverageInactiveDays: number | null;
  newRevenue: number;
  existingRevenue: number;
  existingRevenuePercentage: number | null;
  repeatRevenue: number;
  newRevenuePercentage: number | null;
  repeatRevenuePercentage: number | null;
};

export type Trend = {
  direction: "up" | "down" | "flat";
  value: number;
  suffix: "%" | "dias";
  sentiment: "positive" | "negative" | "neutral";
};

export type SalesTimelinePoint = {
  date: string;
  endDate: string;
  label: string;
  grossSales: number;
  netSales: number;
  paidOrders: number;
  realizationRate: number | null;
};

export type SalesOverview = {
  financialFlow: FinancialFlowData;
  grossSales: number;
  cancellations: number;
  refunds: number;
  netSales: number;
  realizationRate: number | null;
  paidOrders: number;
  buyers: number;
  averageTicket: number | null;
  averageLtv: number | null;
  averageRepurchaseDays: number | null;
  repeatRevenue: number;
  repeatRevenuePercentage: number | null;
  firstPurchaseRevenue: number;
  firstPurchaseRevenuePercentage: number | null;
  reactivatedCustomers: number;
  reactivatedCustomersPercentage: number | null;
  trends: {
    netSales: Trend | null;
    paidOrders: Trend | null;
    buyers: Trend | null;
    averageTicket: Trend | null;
    averageLtv: Trend | null;
    averageRepurchaseDays: Trend | null;
    repeatRevenue: Trend | null;
    firstPurchaseRevenue: Trend | null;
    reactivatedCustomers: Trend | null;
  };
  timeline: SalesTimelinePoint[];
};

export type FinancialSnapshot = {
  grossSales: number;
  cancellations: number;
  refunds: number;
  netSales: number;
  /** null means unavailable, zero means measured as zero. Never added by the UI. */
  recoverableAmount: number | null;
  recoveredAmount: number | null;
};

export type SalesComparison = FinancialSnapshot & {
  startDate: string;
  endDate: string;
  paidOrders: number;
  buyers: number;
  averageTicket: number | null;
  averageLtv: number | null;
  averageRepurchaseDays: number | null;
  repeatRevenue: number;
  firstPurchaseRevenue: number;
  reactivatedCustomers: number;
};

export type FinancialFlowData = FinancialSnapshot & {
  afterCancellations: number;
  afterRefunds: number;
  cancellationsRate: number | null;
  refundsRate: number | null;
  grossToAfterCancellationRate: number | null;
  afterCancellationToAfterRefundRate: number | null;
  realizationRate: number | null;
  recoveryRate: number | null;
  recoverableLossRate: number | null;
  previousPeriod: SalesComparison;
  trends: Record<"grossSales" | "cancellations" | "refunds" | "netSales", Trend | null>;
};

export type JourneyBucketId = "1" | "2-3" | "4-5" | "6+";

/** Consolidated depth of a purchase journey. Touchpoints are not the same as distinct channels. */
export type JourneyDistributionPoint = {
  bucket: JourneyBucketId;
  label: string;
  percentage: number;
};

export type JourneyAnalytics =
  | {
      status: "ready";
      averageTouchpoints: number;
      averageChannels: number;
      averageTimeToPurchaseDays: number;
      distribution: JourneyDistributionPoint[];
    }
  | { status: "insufficient" }
  | { status: "unconfigured" };

export type SalesTrackingData = {
  range: ResolvedTrackingRange;
  granularity: "day" | "week" | "month";
  channels: TrackingChannelRow[];
  attribution: AttributionCoverage & {
    trends: {
      attributedRevenue: Trend | null;
      unattributedRevenue: Trend | null;
      coverageDeltaPoints: number | null;
    };
  };
  reactivation: ReactivationAnalytics;
  firstToSecondConversion: FirstToSecondConversion | null;
  repeatCustomerRate: number | null;
  summary: SalesTrackingSummary;
  overview: SalesOverview;
  purchaseStages: PurchaseStageDistribution[];
  repurchaseBuckets: RepurchaseTimeBucket[];
  ltv: Array<{ key: "new" | "existing" | "reactivated"; label: string; value: number | null }>;
  customers: TrackedCustomer[];
  updatedAt: string;
  source: "mock" | "api";
  /** Supplied by analytics once journey tracking exists. The view never invents this. */
  journey?: JourneyAnalytics;
};
