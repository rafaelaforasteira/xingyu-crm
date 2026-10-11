import type { AbandonedCheckout, RecoveryOrder } from "@xingyu/types";
export const FIXTURE_AS_OF = "2026-10-10T15:00:00.000Z";
export function checkout(
  id = "case-1",
  abandonedAt = "2026-09-15T15:00:00.000Z",
  extra: Partial<AbandonedCheckout> = {},
): AbandonedCheckout {
  return {
    id,
    organizationId: "org-a",
    provider: "shopify",
    externalCheckoutId: id,
    abandonedAt,
    observedUntil: FIXTURE_AS_OF,
    currency: "BRL",
    grossCents: 10001,
    discountCents: 0,
    shippingCents: 0,
    totalCents: 10001,
    items: [
      { sku: "A", productLabel: "Produto A", quantity: 1, netCents: 6000 },
      { sku: "B", productLabel: "Produto B", quantity: 1, netCents: 4001 },
    ],
    customer: {
      customerId: "customer-a",
      label: "Cliente A",
      type: "NEW",
      capturedAt: abandonedAt,
      previousOrderCount: 0,
      previousSpentCents: 0,
      previousOrderAt: null,
    },
    acquisition: { channel: "WHATSAPP", capturedAt: abandonedAt },
    createdAt: abandonedAt,
    updatedAt: abandonedAt,
    ...extra,
  };
}
export function paidOrder(id = "order-1", extra: Partial<RecoveryOrder> = {}): RecoveryOrder {
  return {
    id,
    organizationId: "org-a",
    provider: "shopify",
    currency: "BRL",
    customerId: "customer-a",
    paidAt: "2026-09-16T15:00:00.000Z",
    status: "PAID",
    netCents: 9901,
    items: checkout().items,
    checkoutId: "case-1",
    signals: [],
    ...extra,
  };
}
