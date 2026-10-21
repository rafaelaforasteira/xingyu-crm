import type { ShopifyTrackingOrderNode } from "../../integrations/shopify-admin.client";
import type {
  TrackingAttribution,
  TrackingCustomerIdentity,
  TrackingDataset,
  TrackingOrder,
} from "./tracking-dataset.types";

/** Finalized money that may enter FAROL net sales (matches analytics paidAt contract). */
const FINALIZED_PAID_STATUSES = new Set([
  "PAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);

function moneyToCents(amount: string | undefined | null): number {
  if (!amount) return 0;
  const parsed = Number.parseFloat(amount);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

/** Business calendar day in America/Sao_Paulo (FAROL contract). */
export function toBusinessDate(iso: string | null | undefined): string {
  if (!iso) {
    return toBusinessDate(new Date().toISOString());
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) return iso.slice(0, 10);
  return `${year}-${month}-${day}`;
}

function mapAttribution(
  node: ShopifyTrackingOrderNode,
): TrackingAttribution | undefined {
  const visit =
    node.customerJourneySummary?.lastVisit ??
    node.customerJourneySummary?.firstVisit;
  if (!visit) return undefined;

  const utm = visit.utmParameters;
  const source = (utm?.source ?? "").trim().toLowerCase();
  const medium = (utm?.medium ?? "").trim().toLowerCase();
  const referrer = (visit.referrerUrl ?? "").trim().toLowerCase();
  const landingPage = visit.landingPage?.trim() || undefined;

  let channel: TrackingAttribution["channel"] = "UNKNOWN";
  let platform: TrackingAttribution["platform"];

  if (
    medium.includes("cpc") ||
    medium.includes("ppc") ||
    medium.includes("paid") ||
    medium === "paidsocial" ||
    medium === "paid_social"
  ) {
    if (
      source.includes("google") ||
      source.includes("adwords") ||
      medium.includes("search")
    ) {
      channel = "PAID_SEARCH";
      platform = "GOOGLE";
    } else {
      channel = "PAID_SOCIAL";
      platform =
        source.includes("facebook") ||
        source.includes("instagram") ||
        source.includes("meta") ||
        source.includes("fb")
          ? "META"
          : "OTHER";
    }
  } else if (
    source.includes("instagram") ||
    source.includes("facebook") ||
    source.includes("meta") ||
    referrer.includes("instagram") ||
    referrer.includes("facebook")
  ) {
    channel = "ORGANIC_SOCIAL";
    platform = "META";
  } else if (
    source.includes("whatsapp") ||
    medium.includes("whatsapp") ||
    medium.includes("messaging")
  ) {
    channel = "MESSAGING";
    platform = "WHATSAPP";
  } else if (source.includes("email") || medium.includes("email") || medium === "em") {
    channel = "EMAIL";
  } else if (medium === "referral" || (referrer && !source && !medium)) {
    channel = "REFERRAL";
  } else if (
    !source &&
    !medium &&
    (!referrer || referrer.includes("direct") || referrer === "")
  ) {
    channel = landingPage ? "DIRECT" : "UNKNOWN";
  } else if (source || medium) {
    channel = "OTHER";
  }

  if (channel === "UNKNOWN" && !landingPage && !utm?.campaign) {
    return undefined;
  }

  return {
    channel,
    platform,
    campaignId: utm?.campaign?.trim() || undefined,
    landingPage,
    touchModel: "RECORDED_ORIGIN",
  };
}

function guestCustomerId(orderId: string): string {
  return `guest:${orderId}`;
}

export function mapShopifyOrdersToTrackingDataset(
  nodes: ShopifyTrackingOrderNode[],
): TrackingDataset {
  const customers = new Map<string, TrackingCustomerIdentity>();
  const orders: TrackingOrder[] = [];

  for (const node of nodes) {
    if (!node?.id) continue;

    const status = (node.displayFinancialStatus ?? "").toUpperCase();
    const grossCents = moneyToCents(node.totalPriceSet?.shopMoney?.amount);
    const refundedCents = moneyToCents(node.totalRefundedSet?.shopMoney?.amount);
    const createdDate = toBusinessDate(node.createdAt);
    const isFinalizedPaid = FINALIZED_PAID_STATUSES.has(status);

    // FAROL accepts finalized sales only. Pending/expired/voided must not enter
    // the dataset with net>0 and paidAt=null (analytics throws) nor with a false paidAt.
    if (!isFinalizedPaid) continue;
    if (grossCents <= 0 && refundedCents <= 0) continue;

    const customerId = node.customer?.id ?? guestCustomerId(node.id);
    if (!customers.has(customerId)) {
      const name =
        node.customer?.displayName?.trim() ||
        node.customer?.email?.trim() ||
        "Cliente Shopify";
      customers.set(customerId, {
        id: customerId,
        name,
        email: node.customer?.email?.trim() ?? "",
        phone: node.customer?.phone?.trim() ?? "",
      });
    }

    const adjustments: TrackingOrder["adjustments"] = [];
    if (node.cancelledAt) {
      adjustments.push({
        kind: "CANCELLATION",
        date: toBusinessDate(node.cancelledAt),
        cents: grossCents,
      });
    } else if (refundedCents > 0) {
      adjustments.push({
        kind: "REFUND",
        date: toBusinessDate(node.processedAt ?? node.createdAt),
        cents: Math.min(refundedCents, grossCents),
      });
    }

    const attribution = mapAttribution(node);

    orders.push({
      id: node.id,
      customerId,
      date: createdDate,
      paidAt: toBusinessDate(node.processedAt ?? node.createdAt),
      grossCents,
      adjustments,
      ...(attribution ? { attribution } : {}),
    });
  }

  return {
    customers: [...customers.values()],
    orders,
  };
}
