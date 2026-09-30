/** FAROL normalized input. Dates are inclusive business dates in America/Sao_Paulo. */
export type TrackingChannel =
  | "META_ADS"
  | "INSTAGRAM"
  | "GOOGLE_ADS"
  | "WHATSAPP"
  | "DIRECT"
  | "REFERRAL"
  | "EMAIL"
  | "OTHER"
  | "UNIDENTIFIED";
export interface TrackingAttribution {
  channel:
    | "PAID_SOCIAL"
    | "PAID_SEARCH"
    | "MESSAGING"
    | "ORGANIC_SOCIAL"
    | "DIRECT"
    | "REFERRAL"
    | "EMAIL"
    | "OTHER"
    | "UNKNOWN";
  platform?: "META" | "GOOGLE" | "WHATSAPP" | "OTHER";
  placement?: string;
  campaignId?: string;
  adSetId?: string;
  creativeId?: string;
  landingPage?: string;
  leadId?: string;
  conversationId?: string;
  touchModel: "RECORDED_ORIGIN";
}
export interface TrackingCustomerIdentity {
  id: string;
  /** Only populated by normalization when the CRM profile actually exists. */
  crmProfileId?: string;
  name: string;
  email: string;
  phone: string;
  responsibleUser?: { id: string; name: string };
}
export interface TrackingOrder {
  id: string;
  customerId: string;
  date: string;
  paidAt: string | null;
  grossCents: number;
  adjustments: Array<{ kind: "CANCELLATION" | "REFUND"; date: string; cents: number }>;
  recovery?: { date: string; pendingCents: number; recoveredCents: number };
  attribution?: TrackingAttribution;
}
export interface TrackingDataset {
  customers: TrackingCustomerIdentity[];
  orders: TrackingOrder[];
}
export interface TrackingChannelRow {
  channel: TrackingChannel;
  netRevenue: number;
  previousNetRevenue: number;
  revenueShare: number | null;
  orders: number;
  buyers: number;
  newCustomers: number;
  averageTicket: number | null;
}
export interface AttributionCoverage {
  attributedRevenue: number;
  attributedRevenueShare: number | null;
  unattributedRevenue: number;
  unattributedRevenueShare: number | null;
  totalNetRevenue: number;
}
export interface ReactivationAnalytics {
  eligibleCustomers: number | null;
  reactivatedCustomers: number;
  reactivationRate: number | null;
  netRevenue: number;
  averageInactivityDays: number | null;
}
export interface FirstToSecondConversion {
  rate: number | null;
  eligibleCustomers: number;
  convertedCustomers: number;
  observationWindowDays: number;
  /** Percentage-point change versus a prior cohort, when that comparison exists. */
  deltaPoints?: number | null;
}
export type ResolvedTrackingRange = { startDate: string; endDate: string };
