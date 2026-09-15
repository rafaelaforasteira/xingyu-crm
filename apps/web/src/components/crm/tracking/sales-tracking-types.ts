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
  state: string;
  product: string;
};

export type SalesTrackingSummary = {
  periodRevenue: number;
  ordersCount: number;
  buyersCount: number;
  averageTicket: number;
  averageLtv: number;
  averageRepurchaseDays: number;
  medianRepurchaseDays: number;
  firstToSecondPurchaseDays: number;
  newCustomers: number;
  existingCustomers: number;
  reactivatedCustomers: number;
  reactivatedRevenue: number;
  reactivatedAverageLtv: number;
  reactivatedAverageInactiveDays: number;
  newRevenue: number;
  repeatRevenue: number;
  newRevenuePercentage: number;
  repeatRevenuePercentage: number;
};

export type Trend = {
  direction: "up" | "down" | "flat";
  value: number;
  suffix: "%" | "dias";
  sentiment: "positive" | "negative" | "neutral";
};

export type SalesTimelinePoint = {
  date: string;
  label: string;
  grossSales: number;
  netSales: number;
  paidOrders: number;
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
  averageTicket: number;
  averageLtv: number;
  averageRepurchaseDays: number;
  repeatRevenue: number;
  repeatRevenuePercentage: number;
  firstPurchaseRevenue: number;
  firstPurchaseRevenuePercentage: number;
  reactivatedCustomers: number;
  reactivatedCustomersPercentage: number;
  trends: {
    netSales: Trend | null;
    averageLtv: Trend | null;
    averageRepurchaseDays: Trend | null;
    repeatRevenue: Trend | null;
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
  averageLtv: number;
  averageRepurchaseDays: number;
  repeatRevenue: number;
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

export type SalesTrackingData = {
  summary: SalesTrackingSummary;
  overview: SalesOverview;
  purchaseStages: PurchaseStageDistribution[];
  repurchaseBuckets: RepurchaseTimeBucket[];
  ltv: Array<{ key: "all" | "new" | "existing" | "reactivated"; label: string; value: number }>;
  health: Array<{ status: CustomerStatus; label: string; customers: number; percentage: number }>;
  customers: TrackedCustomer[];
  updatedAt: string;
  source: "mock" | "api";
};
