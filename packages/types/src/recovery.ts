/** Normalized BRAINX contract. Monetary amounts are safe integer minor units (cents). */
export type RecoveryStatus = "OPEN" | "RECOVERED" | "EXPIRED";
export type RecoveryMethod = "AUTOMATIC" | "CONSULTANT" | "MIXED" | "UNKNOWN";
export type RecoveryChannel =
  | "META_ADS"
  | "GOOGLE_ADS"
  | "WHATSAPP"
  | "INSTAGRAM"
  | "EMAIL"
  | "REFERRAL"
  | "DIRECT"
  | "OTHER"
  | "UNIDENTIFIED";
export type RecoveryConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
export interface RecoveryItem {
  sku: string;
  productLabel: string;
  quantity: number;
  netCents: number;
}
export interface RecoveryCustomerSnapshot {
  customerId: string | null;
  label: string | null;
  type: "NEW" | "EXISTING" | "UNKNOWN";
  capturedAt: string;
  previousOrderCount: number | null;
  previousSpentCents: number | null;
  previousOrderAt: string | null;
}
export interface RecoverySignal {
  kind: "EXPLICIT" | "SIGNED_TOKEN" | "ACTOR_METADATA" | "MAPPED_CAMPAIGN" | "MAPPED_COUPON";
  method: Exclude<RecoveryMethod, "UNKNOWN">;
  verified: boolean;
  evidence: string;
  consultantId?: string;
  consultantLabel?: string;
  automationId?: string;
}
export interface AbandonedCheckout {
  id: string;
  organizationId: string;
  provider: string;
  externalCheckoutId: string;
  checkoutToken?: string;
  abandonedAt: string;
  observedUntil: string;
  currency: string;
  grossCents: number | null;
  discountCents: number;
  shippingCents: number | null;
  totalCents: number | null;
  items: RecoveryItem[];
  customer: RecoveryCustomerSnapshot;
  acquisition: { channel: RecoveryChannel; capturedAt: string; campaignId?: string };
  createdAt: string;
  updatedAt: string;
}
export interface RecoveryOrder {
  id: string;
  organizationId: string;
  provider: string;
  currency: string;
  customerId: string | null;
  paidAt: string;
  status: "PAID" | "UNPAID" | "CANCELLED";
  netCents: number;
  items: RecoveryItem[];
  checkoutId?: string;
  recoveryCaseId?: string;
  checkoutToken?: string;
  providerRelationshipId?: string;
  signals: RecoverySignal[];
}
export interface RecoveryAttribution {
  method: RecoveryMethod;
  confidence: RecoveryConfidence;
  evidence: string[];
  reason: string;
  consultantId: string | null;
  consultantLabel: string | null;
  conflict: boolean;
}
export interface RecoveryCase extends AbandonedCheckout {
  totalCents: number;
  deadline: string;
  status: RecoveryStatus;
  mature: boolean;
  recoveredOrder: RecoveryOrder | null;
  attribution: RecoveryAttribution;
  match: {
    reason: string;
    confidence: RecoveryConfidence;
    matchedAt: string | null;
    ambiguous: boolean;
  };
}
export interface RecoveryQuery {
  startDate: string;
  endDate: string;
  status?: RecoveryStatus;
  method?: RecoveryMethod;
  customerType?: RecoveryCustomerSnapshot["type"];
  valueBand?: string;
  channel?: RecoveryChannel;
  currency?: string;
  page?: number;
  pageSize?: number;
  sort?: "priority" | "value" | "oldest" | "deadline";
  search?: string;
}
export interface RecoverySummary {
  eligibleCases: number;
  matureCases: number;
  openCases: number;
  recoveredCases: number;
  expiredCases: number;
  abandonedCents: number;
  recoveredCents: number;
  recoveredAbandonedCents: number;
  openCents: number;
  recoveryRate: number | null;
  expectedRecoverableCents: number | null;
}
export interface RecoverySegment {
  key: string;
  label: string;
  cases: number;
  matureCases: number;
  recoveredCases: number;
  abandonedCents: number;
  recoveredCents: number;
  recoveryRate: number | null;
  meanHours: number | null;
  sufficientSample: boolean;
  interval: [number, number] | null;
}
export interface RecoveryMethodRow {
  method: RecoveryMethod;
  cases: number;
  revenueCents: number;
  caseShare: number | null;
  revenueShare: number | null;
  meanHours: number | null;
}
/** Three-category visual projection; canonical attribution remains auditably unchanged. */
export type RecoveryCompositionMethod = Exclude<RecoveryMethod, "MIXED">;
export type RecoveryCompositionRow = Omit<RecoveryMethodRow, "method"> & {
  method: RecoveryCompositionMethod;
};
export interface RecoveryInsight {
  id: string;
  category: "OPPORTUNITY" | "TREND" | "RISK" | "PATTERN" | "ANOMALY" | "DATA_QUALITY";
  severity: "INFO" | "ATTENTION";
  title: string;
  summary: string;
  evidence: Array<{ metric: string; value: string | number | null }>;
  confidence: RecoveryConfidence;
  actionStatus: "INFORMATIONAL" | "COMING_SOON";
}
export interface RecoveryModelStatus {
  status: "LEARNING" | "EXPERIMENTAL" | "READY";
  mode: "DEMO" | "PRODUCTION";
  version: string | null;
  target: "recoveredWithinWindow";
  matureCases: number;
  positiveCases: number;
  excludedCases: number;
  minimumMature: number;
  minimumPositive: number;
  reason: string;
  validation: null | {
    rocAuc: number;
    prAuc: number;
    logLoss: number;
    brier: number;
    calibrationError: number;
    precision: number;
    recall: number;
    topRevenueShare: number;
    trainingEnd: string;
    validationStart: string;
    calibrationEnd: string;
  };
}
export interface RecoveryQuality {
  duplicatedCheckouts: number;
  duplicatedOrders: number;
  invalidCases: number;
  missingValues: number;
  unknownCustomers: number;
  missingSource: number;
  ambiguousCases: number;
  unmatchedOrders: number;
  conflictingAttribution: number;
  excludedCurrencyCases: number;
  excludedMlCases: number;
  reconciliation: {
    cases: boolean;
    methods: boolean;
    revenue: boolean;
    time: boolean;
    uniqueOrders: boolean;
  };
}
export interface RecoveryOverviewData {
  range: { startDate: string; endDate: string };
  previousRange: { startDate: string; endDate: string };
  source: "demo" | "production";
  provider: string;
  updatedAt: string;
  timezone: string;
  currency: string;
  attributionDays: number;
  summary: RecoverySummary;
  previousSummary: RecoverySummary;
  methodBreakdown: RecoveryMethodRow[];
  compositionBreakdown: RecoveryCompositionRow[];
  consultantBreakdown: Array<{
    id: string | null;
    label: string;
    cases: number;
    revenueCents: number;
    meanHours: number | null;
  }>;
  attributionCoverage: {
    casePercent: number | null;
    revenuePercent: number | null;
    identifiedCases: number;
    identifiedCents: number;
  };
  timeline: Array<{
    date: string;
    abandonedCents: number;
    recoveredCents: number;
    abandonedCases: number;
    recoveredCases: number;
    previousAbandonedCents: number;
    previousRecoveredCents: number;
    previousAbandonedCases: number;
    previousRecoveredCases: number;
  }>;
  timeToRecovery: {
    meanHours: number | null;
    medianHours: number | null;
    buckets: Array<{ key: string; label: string; cases: number; share: number | null }>;
  };
  customerSegments: RecoverySegment[];
  valueSegments: RecoverySegment[];
  channels: RecoverySegment[];
  products: Array<RecoverySegment & { lineItems: number; allocatedRecoveredCents: number }>;
  intelligence: RecoveryInsight[];
  predictionStatus: RecoveryModelStatus;
  predictionDistribution: null | Array<{ band: string; cases: number }>;
  dataQuality: RecoveryQuality;
  filterOptions: {
    channels: RecoveryChannel[];
    currencies: string[];
    valueBands: Array<{ key: string; label: string }>;
  };
}
export interface RecoveryOpportunity {
  id: string;
  checkoutLabel: string;
  customerLabel: string;
  customerType: RecoveryCustomerSnapshot["type"];
  channel: RecoveryChannel;
  abandonedCents: number;
  abandonedAt: string;
  ageHours: number;
  remainingHours: number;
  itemCount: number;
  probability: number | null;
  expectedCents: number | null;
  historicalRate: number | null;
  historicalEstimateCents: number | null;
  priority: "HISTORICAL" | "VALUE" | "PREDICTIVE";
  explanation: string;
  matchAmbiguous: boolean;
}
export interface RecoveryOpportunitiesData {
  source: "demo" | "production";
  currency: string;
  data: RecoveryOpportunity[];
  meta: { total: number; page: number; pageSize: number; pageCount: number };
}
