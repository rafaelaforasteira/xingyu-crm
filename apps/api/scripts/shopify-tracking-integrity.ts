/**
 * Integrity probe: Shopify sample vs mapper output.
 * Run: node --env-file=../../.env -r ts-node/register scripts/shopify-tracking-integrity.ts
 */
import { ShopifyAdminClient } from "../src/integrations/shopify-admin.client";
import { mapShopifyOrdersToTrackingDataset } from "../src/tracking/overview/shopify-tracking.mapper";

const PAID = new Set(["PAID", "PARTIALLY_REFUNDED", "REFUNDED"]);

void (async () => {
  const client = new ShopifyAdminClient();
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - 18);
  since.setUTCHours(0, 0, 0, 0);
  const sinceDay = since.toISOString().slice(0, 10);

  const countData = await client.graphql<{ ordersCount?: { count?: number } }>(
    `query($q:String!){ ordersCount(query:$q){ count } }`,
    { q: `created_at:>=${sinceDay}` },
  );
  const shopifyCount = countData.ordersCount?.count ?? 0;

  const nodes = await client.fetchOrdersForTracking(since);
  const dataset = mapShopifyOrdersToTrackingDataset(nodes);

  const statusBreakdown: Record<string, number> = {};
  for (const n of nodes) {
    const s = (n.displayFinancialStatus ?? "NULL").toUpperCase();
    statusBreakdown[s] = (statusBreakdown[s] ?? 0) + 1;
  }

  const mappedByStatus: Record<string, { count: number; withPaidAt: number }> = {};
  for (const n of nodes) {
    const s = (n.displayFinancialStatus ?? "NULL").toUpperCase();
    const mapped = dataset.orders.find((o) => o.id === n.id);
    if (!mappedByStatus[s]) mappedByStatus[s] = { count: 0, withPaidAt: 0 };
    if (mapped) {
      mappedByStatus[s].count += 1;
      if (mapped.paidAt) mappedByStatus[s].withPaidAt += 1;
    }
  }

  // Spot-check: last 30d PAID totals from raw nodes vs mapped paidAt
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const startDay = start.toISOString().slice(0, 10);
  const endDay = end.toISOString().slice(0, 10);

  let shopifyPaidCents = 0;
  let shopifyPaidOrders = 0;
  for (const n of nodes) {
    const day = (n.createdAt ?? "").slice(0, 10);
    if (day < startDay || day > endDay) continue;
    const status = (n.displayFinancialStatus ?? "").toUpperCase();
    if (!PAID.has(status)) continue;
    if (n.cancelledAt) continue;
    const amount = Number.parseFloat(n.totalPriceSet?.shopMoney?.amount ?? "0");
    const refunded = Number.parseFloat(n.totalRefundedSet?.shopMoney?.amount ?? "0");
    shopifyPaidOrders += 1;
    shopifyPaidCents += Math.round((amount - Math.min(refunded, amount)) * 100);
  }

  let mappedPaidCents = 0;
  let mappedPaidOrders = 0;
  for (const o of dataset.orders) {
    if (!o.paidAt || o.date < startDay || o.date > endDay) continue;
    const cancel = o.adjustments
      .filter((a) => a.kind === "CANCELLATION")
      .reduce((s, a) => s + a.cents, 0);
    const refund = o.adjustments
      .filter((a) => a.kind === "REFUND")
      .reduce((s, a) => s + a.cents, 0);
    const net = o.grossCents - cancel - refund;
    if (net <= 0) continue;
    mappedPaidOrders += 1;
    mappedPaidCents += net;
  }

  const unpaidWithPaidAt = dataset.orders.filter((o) => {
    const n = nodes.find((x) => x.id === o.id);
    const status = (n?.displayFinancialStatus ?? "").toUpperCase();
    return o.paidAt && !PAID.has(status);
  }).length;

  const issues: string[] = [];
  // Allow tiny drift: orders created while the multi-page fetch runs.
  if (nodes.length < shopifyCount - 5) {
    issues.push(
      `INCOMPLETE_FETCH: fetched ${nodes.length} of ${shopifyCount} Shopify orders in window`,
    );
  }
  if (unpaidWithPaidAt > 0) {
    issues.push(`FALSE_PAID: ${unpaidWithPaidAt} non-PAID orders have paidAt set`);
  }
  if (shopifyPaidOrders !== mappedPaidOrders || shopifyPaidCents !== mappedPaidCents) {
    issues.push(
      `PERIOD_MISMATCH_30D: shopify paid ${shopifyPaidOrders}/${shopifyPaidCents}c vs mapped ${mappedPaidOrders}/${mappedPaidCents}c`,
    );
  }

  console.log(
    JSON.stringify(
      {
        shopifyCount,
        fetched: nodes.length,
        mappedOrders: dataset.orders.length,
        mappedCustomers: dataset.customers.length,
        statusBreakdown,
        mappedByStatus,
        window30d: { startDay, endDay, shopifyPaidOrders, shopifyPaidCents, mappedPaidOrders, mappedPaidCents },
        unpaidWithPaidAt,
        issues,
        ok: issues.length === 0,
      },
      null,
      2,
    ),
  );
  if (issues.length) process.exitCode = 1;
})();
