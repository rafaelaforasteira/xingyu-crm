/** FAROL-normalized tracking input (mirrors web tracking-analytics-types). */
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
