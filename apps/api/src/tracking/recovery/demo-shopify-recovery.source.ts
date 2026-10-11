import { Injectable } from "@nestjs/common";
import type { AbandonedCheckout, RecoveryOrder, RecoverySignal } from "@xingyu/types";
import type { RecoveryDataSource } from "./recovery-data-source";
import { DAY_MS, HOUR_MS, RECOVERY_CHANNELS } from "./recovery.config";

/** Deterministic normalized reconciliation fixture. Never writes commerce records to Prisma. */
@Injectable()
export class DemoShopifyRecoveryDataSource implements RecoveryDataSource {
  async load(organizationId: string, asOf: string) {
    const checkouts: AbandonedCheckout[] = [],
      orders: RecoveryOrder[] = [];
    const anchor = Date.parse("2024-01-01T12:00:00-03:00"),
      now = Date.parse(asOf);
    const products = [
      "Tênis urbano",
      "Bolsa transversal",
      "Camisa essencial",
      "Jaqueta leve",
      "Kit acessórios",
      "Calça casual",
    ];
    for (let day = 0; anchor + day * DAY_MS <= now; day++) {
      for (let slot = 0; slot < 5; slot++) {
        const n = day * 5 + slot;
        const at = anchor + day * DAY_MS + slot * HOUR_MS;
        if (at > now) continue;
        const abandonedAt = new Date(at).toISOString(),
          id = `demo-case-${n}`,
          externalCheckoutId = `demo-checkout-${n}`;
        const previousOrderCount = n % 3 ? 0 : 1 + (n % 7);
        const missing = n % 53 === 0;
        const sku = `SKU-${(n % products.length) + 1}`;
        const gross = 12900 + ((n * 7919) % 198000),
          discount = n % 4 === 0 ? 1500 : 0;
        const count = 1 + (n % 3);
        const items = [
          {
            sku,
            productLabel: products[n % products.length],
            quantity: count,
            netCents: gross - discount,
          },
        ];
        if (n % 4 === 1)
          items.push({
            sku: `SKU-${((n + 1) % products.length) + 1}`,
            productLabel: products[(n + 1) % products.length],
            quantity: 1,
            netCents: 9900,
          });
        const total = items.reduce((v, i) => v + i.netCents, 0);
        const c: AbandonedCheckout = {
          id,
          organizationId,
          provider: "shopify",
          externalCheckoutId,
          checkoutToken: `demo-token-${n}`,
          abandonedAt,
          observedUntil: asOf,
          currency: "BRL",
          grossCents: total + discount,
          discountCents: discount,
          shippingCents: 0,
          totalCents: total,
          items,
          customer: {
            customerId: missing ? null : `demo-customer-${Math.floor(n / 2) % 140}`,
            label: missing ? null : `Cliente demonstrativo ${(Math.floor(n / 2) % 140) + 1}`,
            type: missing ? "UNKNOWN" : previousOrderCount ? "EXISTING" : "NEW",
            capturedAt: abandonedAt,
            previousOrderCount: missing ? null : previousOrderCount,
            previousSpentCents: missing ? null : previousOrderCount * 45900,
            previousOrderAt: previousOrderCount
              ? new Date(at - (20 + (n % 80)) * DAY_MS).toISOString()
              : null,
          },
          acquisition: {
            channel: RECOVERY_CHANNELS[n % RECOVERY_CHANNELS.length],
            capturedAt: abandonedAt,
          },
          createdAt: abandonedAt,
          updatedAt: abandonedAt,
        };
        checkouts.push(c);
        // Different observed recovery propensities, never a prediction or production attribution.
        if (n % 10 < (previousOrderCount ? 5 : 3)) {
          const lag = [0.5, 4, 18, 48, 120, 240][n % 6];
          const paidAt = new Date(at + lag * HOUR_MS).toISOString();
          if (Date.parse(paidAt) > now) continue;
          let signals: RecoverySignal[] = [];
          if (n % 4 === 0)
            signals = [
              {
                kind: "ACTOR_METADATA",
                method: "AUTOMATIC",
                verified: true,
                evidence: `Fixture explícita automationId=demo-auto-${n % 3}`,
                automationId: `demo-auto-${n % 3}`,
              },
            ];
          if (n % 4 === 1)
            signals = [
              {
                kind: "ACTOR_METADATA",
                method: "CONSULTANT",
                verified: true,
                evidence: "Fixture explícita actorType=human",
                ...(n % 9
                  ? {
                      consultantId: "demo-consultant-1",
                      consultantLabel: "Consultora demonstrativa A",
                    }
                  : {}),
              },
            ];
          if (n % 4 === 2)
            signals = [
              {
                kind: "ACTOR_METADATA",
                method: "AUTOMATIC",
                verified: true,
                evidence: "Fixture: intervenção automática registrada",
              },
              {
                kind: "ACTOR_METADATA",
                method: "CONSULTANT",
                verified: true,
                evidence: "Fixture: intervenção humana registrada",
              },
            ];
          orders.push({
            id: `demo-order-${n}`,
            organizationId,
            provider: "shopify",
            currency: "BRL",
            customerId: c.customer.customerId,
            paidAt,
            status: "PAID",
            netCents: total - Math.min(total, (n % 7) * 100),
            items,
            checkoutId: externalCheckoutId,
            signals,
          });
        }
      }
    }
    if (checkouts.length) {
      const recent = checkouts[checkouts.length - 5] ?? checkouts[0];
      checkouts.push({ ...recent, id: `${recent.id}-duplicate` });
      checkouts.push({
        ...recent,
        id: "demo-missing-value",
        externalCheckoutId: "demo-missing-value",
        checkoutToken: undefined,
        totalCents: null,
      });
      const paid = new Date(Date.parse(recent.abandonedAt) + HOUR_MS).toISOString();
      if (Date.parse(paid) <= now) {
        const ambiguous = {
          ...recent,
          id: "demo-ambiguous-a",
          externalCheckoutId: "demo-ambiguous-a",
          checkoutToken: "demo-shared-token",
        };
        checkouts.push(ambiguous, {
          ...ambiguous,
          id: "demo-ambiguous-b",
          externalCheckoutId: "demo-ambiguous-b",
        });
        orders.push({
          id: "demo-ambiguous-order",
          organizationId,
          provider: "shopify",
          currency: "BRL",
          paidAt: paid,
          status: "PAID",
          netCents: recent.totalCents!,
          customerId: recent.customer.customerId,
          items: recent.items,
          checkoutToken: "demo-shared-token",
          signals: [],
        });
      }
    }
    return {
      source: "demo" as const,
      provider: "Shopify · adapter demonstrativo normalizado",
      timezone: "America/Sao_Paulo",
      checkouts,
      orders,
    };
  }
}
