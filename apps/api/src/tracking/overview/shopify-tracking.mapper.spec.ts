import { mapShopifyOrdersToTrackingDataset } from "./shopify-tracking.mapper";
import type { ShopifyTrackingOrderNode } from "../../integrations/shopify-admin.client";

function order(partial: Partial<ShopifyTrackingOrderNode> & { id: string }): ShopifyTrackingOrderNode {
  return {
    createdAt: "2026-01-15T12:00:00Z",
    processedAt: "2026-01-15T12:05:00Z",
    displayFinancialStatus: "PAID",
    totalPriceSet: { shopMoney: { amount: "150.50", currencyCode: "BRL" } },
    totalRefundedSet: { shopMoney: { amount: "0.00", currencyCode: "BRL" } },
    customer: {
      id: "gid://shopify/Customer/1",
      displayName: "Ana Silva",
      email: "ana@example.com",
      phone: "+5511999999999",
    },
    ...partial,
  };
}

describe("mapShopifyOrdersToTrackingDataset", () => {
  it("maps paid order to TrackingOrder with cents and customer", () => {
    const dataset = mapShopifyOrdersToTrackingDataset([
      order({
        id: "gid://shopify/Order/100",
        customerJourneySummary: {
          lastVisit: {
            landingPage: "https://loja.example/produto",
            utmParameters: {
              source: "facebook",
              medium: "cpc",
              campaign: "summer",
            },
          },
        },
      }),
    ]);

    expect(dataset.customers).toHaveLength(1);
    expect(dataset.customers[0]).toMatchObject({
      id: "gid://shopify/Customer/1",
      email: "ana@example.com",
      name: "Ana Silva",
    });
    expect(dataset.orders).toHaveLength(1);
    expect(dataset.orders[0]).toMatchObject({
      id: "gid://shopify/Order/100",
      customerId: "gid://shopify/Customer/1",
      date: "2026-01-15",
      paidAt: "2026-01-15",
      grossCents: 15050,
      adjustments: [],
      attribution: {
        channel: "PAID_SOCIAL",
        platform: "META",
        campaignId: "summer",
        touchModel: "RECORDED_ORIGIN",
      },
    });
  });

  it("adds refund adjustment from totalRefundedSet", () => {
    const dataset = mapShopifyOrdersToTrackingDataset([
      order({
        id: "gid://shopify/Order/101",
        displayFinancialStatus: "PARTIALLY_REFUNDED",
        totalRefundedSet: { shopMoney: { amount: "20.00", currencyCode: "BRL" } },
      }),
    ]);

    expect(dataset.orders[0].adjustments).toEqual([
      { kind: "REFUND", date: "2026-01-15", cents: 2000 },
    ]);
  });

  it("adds cancellation adjustment when cancelledAt is set", () => {
    const dataset = mapShopifyOrdersToTrackingDataset([
      order({
        id: "gid://shopify/Order/102",
        cancelledAt: "2026-01-16T10:00:00Z",
        displayFinancialStatus: "REFUNDED",
      }),
    ]);

    expect(dataset.orders[0].adjustments).toEqual([
      { kind: "CANCELLATION", date: "2026-01-16", cents: 15050 },
    ]);
  });

  it("creates guest customer when order has no customer", () => {
    const dataset = mapShopifyOrdersToTrackingDataset([
      order({
        id: "gid://shopify/Order/103",
        customer: null,
      }),
    ]);

    expect(dataset.customers[0].id).toBe("guest:gid://shopify/Order/103");
    expect(dataset.orders[0].customerId).toBe("guest:gid://shopify/Order/103");
  });

  it("excludes PENDING and EXPIRED even when processedAt is set", () => {
    const dataset = mapShopifyOrdersToTrackingDataset([
      order({
        id: "gid://shopify/Order/pending",
        displayFinancialStatus: "PENDING",
        processedAt: "2026-01-15T12:05:00Z",
      }),
      order({
        id: "gid://shopify/Order/expired",
        displayFinancialStatus: "EXPIRED",
        processedAt: "2026-01-15T12:05:00Z",
      }),
      order({ id: "gid://shopify/Order/paid" }),
    ]);

    expect(dataset.orders.map((o) => o.id)).toEqual(["gid://shopify/Order/paid"]);
  });
});
