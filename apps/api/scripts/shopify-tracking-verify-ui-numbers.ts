/**
 * Confirms FAROL paid-net for last 30d matches Shopify raw finalized orders.
 * Run: node --env-file=../../.env -r ts-node/register scripts/shopify-tracking-verify-ui-numbers.ts
 */
import { ShopifyAdminClient } from "../src/integrations/shopify-admin.client";
import {
  mapShopifyOrdersToTrackingDataset,
  toBusinessDate,
} from "../src/tracking/overview/shopify-tracking.mapper";

void (async () => {
  const client = new ShopifyAdminClient();
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 18);
  since.setUTCHours(0, 0, 0, 0);

  const started = Date.now();
  const nodes = await client.fetchOrdersForTracking(since);
  const fetchMs = Date.now() - started;
  const dataset = mapShopifyOrdersToTrackingDataset(nodes);

  const endDay = toBusinessDate(new Date().toISOString());
  const end = new Date(`${endDay}T12:00:00-03:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  const startDay = toBusinessDate(start.toISOString());

  let shopifyNet = 0;
  let shopifyOrders = 0;
  for (const n of nodes) {
    const day = toBusinessDate(n.createdAt);
    if (day < startDay || day > endDay) continue;
    const status = (n.displayFinancialStatus ?? "").toUpperCase();
    if (!["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(status)) continue;
    const gross = Math.round(Number.parseFloat(n.totalPriceSet?.shopMoney?.amount ?? "0") * 100);
    const refunded = Math.round(
      Number.parseFloat(n.totalRefundedSet?.shopMoney?.amount ?? "0") * 100,
    );
    if (n.cancelledAt) continue;
    const net = gross - Math.min(refunded, gross);
    if (net <= 0) continue;
    shopifyOrders += 1;
    shopifyNet += net;
  }

  let mappedNet = 0;
  let mappedOrders = 0;
  for (const o of dataset.orders) {
    if (!o.paidAt || o.date < startDay || o.date > endDay) continue;
    const cancel = o.adjustments
      .filter((a) => a.kind === "CANCELLATION" && a.date <= endDay)
      .reduce((s, a) => s + a.cents, 0);
    const refund = o.adjustments
      .filter((a) => a.kind === "REFUND" && a.date <= endDay)
      .reduce((s, a) => s + a.cents, 0);
    const net = o.grossCents - cancel - refund;
    if (net <= 0) continue;
    mappedOrders += 1;
    mappedNet += net;
  }

  const ok = shopifyOrders === mappedOrders && shopifyNet === mappedNet;
  console.log(
    JSON.stringify(
      {
        fetchMs,
        fetchedNodes: nodes.length,
        mappedOrders: dataset.orders.length,
        period: { startDay, endDay },
        shopify: { orders: shopifyOrders, netCents: shopifyNet, netBRL: shopifyNet / 100 },
        mappedFarol: { orders: mappedOrders, netCents: mappedNet, netBRL: mappedNet / 100 },
        deltaCents: mappedNet - shopifyNet,
        ok,
        note:
          "UI 'Vendas líquidas' for 30d uses the same FAROL net rule (gross − cancel − refund, paid only).",
      },
      null,
      2,
    ),
  );
  process.exitCode = ok ? 0 : 1;
})();
