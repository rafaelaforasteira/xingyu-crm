import type {
  AbandonedCheckout,
  RecoveryCase,
  RecoveryOrder,
  RecoveryQuality,
} from "@xingyu/types";
import { RECOVERY_RULES, DAY_MS } from "./recovery.config";
import { cents } from "./recovery-math";
import { RecoveryAttributionResolver, unknownAttribution } from "./recovery-attribution";

type MatchOptions = { attributionDays?: number; allowIdentityBasketMatch?: boolean };
function basket(a: AbandonedCheckout, b: RecoveryOrder): number {
  const quantities = (items: AbandonedCheckout["items"]) =>
    items.reduce(
      (map, i) => map.set(i.sku, (map.get(i.sku) ?? 0) + i.quantity),
      new Map<string, number>(),
    );
  const x = quantities(a.items),
    y = quantities(b.items),
    keys = new Set([...x.keys(), ...y.keys()]);
  let intersection = 0,
    union = 0;
  for (const key of keys) {
    intersection += Math.min(x.get(key) ?? 0, y.get(key) ?? 0);
    union += Math.max(x.get(key) ?? 0, y.get(key) ?? 0);
  }
  return union ? intersection / union : 0;
}
export function reconcileRecovery(
  input: AbandonedCheckout[],
  orders: RecoveryOrder[],
  organizationId: string,
  asOf: string,
  options: MatchOptions = {},
) {
  const days = options.attributionDays ?? RECOVERY_RULES.attributionDays;
  const now = Date.parse(asOf);
  if (!Number.isFinite(now) || !Number.isInteger(days) || days <= 0)
    throw new Error("Invalid recovery observation window");
  const quality: Omit<RecoveryQuality, "reconciliation"> = {
    duplicatedCheckouts: 0,
    duplicatedOrders: 0,
    invalidCases: 0,
    missingValues: 0,
    unknownCustomers: 0,
    missingSource: 0,
    ambiguousCases: 0,
    unmatchedOrders: 0,
    conflictingAttribution: 0,
    excludedCurrencyCases: 0,
    excludedMlCases: 0,
  };
  const scoped = input.filter((c) => c.organizationId === organizationId);
  const groups = new Map<string, AbandonedCheckout[]>();
  for (const c of scoped) {
    const key = `${c.provider}:${c.externalCheckoutId}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const seenIds = new Set<string>();
  const cases: RecoveryCase[] = [];
  for (const group of groups.values()) {
    quality.duplicatedCheckouts += group.length - 1;
    // Repeated identical snapshots may be deduplicated. Conflicting snapshots require reconciliation upstream.
    const signature = (c: AbandonedCheckout) =>
      JSON.stringify({ ...c, id: undefined, createdAt: undefined, updatedAt: undefined });
    if (group.some((c) => signature(c) !== signature(group[0]))) {
      quality.invalidCases += group.length;
      continue;
    }
    const c = group[0],
      at = Date.parse(c.abandonedAt),
      observed = Date.parse(c.observedUntil);
    if (c.totalCents == null) quality.missingValues++;
    const invalid =
      !c.id ||
      seenIds.has(c.id) ||
      !c.provider ||
      !c.externalCheckoutId ||
      !/^[A-Z]{3}$/.test(c.currency) ||
      !cents(c.totalCents) ||
      !cents(c.grossCents) ||
      !cents(c.discountCents) ||
      (c.shippingCents != null && !cents(c.shippingCents)) ||
      c.discountCents > c.grossCents ||
      !Number.isFinite(at) ||
      !Number.isFinite(observed) ||
      observed < at ||
      at > now ||
      !c.items.length ||
      c.items.some(
        (i) => !i.sku || !Number.isInteger(i.quantity) || i.quantity <= 0 || !cents(i.netCents),
      );
    if (invalid) {
      quality.invalidCases++;
      continue;
    }
    seenIds.add(c.id);
    const deadline = new Date(at + days * DAY_MS).toISOString();
    // An old checkout with truncated observation is neither recoverable now nor a valid negative label.
    if (now >= Date.parse(deadline) && observed < Date.parse(deadline)) {
      quality.invalidCases++;
      continue;
    }
    const mature = Math.min(now, observed) >= Date.parse(deadline);
    cases.push({
      ...c,
      totalCents: c.totalCents,
      deadline,
      status: mature ? "EXPIRED" : "OPEN",
      mature,
      recoveredOrder: null,
      attribution: unknownAttribution(),
      match: {
        reason: "Sem pedido pago associado.",
        confidence: "UNAVAILABLE",
        matchedAt: null,
        ambiguous: false,
      },
    });
  }
  const orderGroups = new Map<string, RecoveryOrder[]>();
  for (const o of orders.filter((o) => o.organizationId === organizationId)) {
    const key = `${o.provider}:${o.id}`;
    orderGroups.set(key, [...(orderGroups.get(key) ?? []), o]);
  }
  const validOrders = [...orderGroups.values()]
    .flatMap((group) => {
      quality.duplicatedOrders += group.length - 1;
      if (group.some((o) => JSON.stringify(o) !== JSON.stringify(group[0]))) return [];
      const o = group[0];
      return o.status === "PAID" &&
        cents(o.netCents) &&
        Number.isFinite(Date.parse(o.paidAt)) &&
        Date.parse(o.paidAt) <= now
        ? [o]
        : [];
    })
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt) || a.id.localeCompare(b.id));
  const resolver = new RecoveryAttributionResolver();
  const indexes = {
    checkout: new Map<string, RecoveryCase[]>(),
    case: new Map<string, RecoveryCase[]>(),
    token: new Map<string, RecoveryCase[]>(),
    customer: new Map<string, RecoveryCase[]>(),
  };
  const indexKey = (provider: string, currency: string, id: string) =>
    JSON.stringify([provider, currency, id]);
  for (const c of cases) {
    for (const [kind, id] of [
      ["checkout", c.externalCheckoutId],
      ["case", c.id],
      ["token", c.checkoutToken],
      ["customer", c.customer.customerId],
    ] as const) {
      if (!id) continue;
      const key = indexKey(c.provider, c.currency, id),
        index = indexes[kind];
      index.set(key, [...(index.get(key) ?? []), c]);
    }
  }
  for (const order of validOrders) {
    const paid = Date.parse(order.paidAt);
    const possible = new Set<RecoveryCase>();
    const identities: Array<[keyof typeof indexes, string | undefined | null]> = [
      ["checkout", order.checkoutId],
      ["checkout", order.providerRelationshipId],
      ["case", order.recoveryCaseId],
      ["token", order.checkoutToken],
    ];
    if (options.allowIdentityBasketMatch ?? RECOVERY_RULES.allowIdentityBasketMatch)
      identities.push(["customer", order.customerId]);
    for (const [kind, id] of identities)
      if (id)
        for (const c of indexes[kind].get(indexKey(order.provider, order.currency, id)) ?? [])
          possible.add(c);
    const candidates = [...possible]
      .filter(
        (c) =>
          !c.recoveredOrder &&
          c.provider === order.provider &&
          c.currency === order.currency &&
          paid >= Date.parse(c.abandonedAt) &&
          paid <= Date.parse(c.deadline) &&
          paid <= Date.parse(c.observedUntil),
      )
      .flatMap((c) => {
        let rank = 0,
          reason = "";
        if (order.checkoutId === c.externalCheckoutId) {
          rank = 5;
          reason = "Relação explícita checkout/pedido";
        } else if (order.recoveryCaseId === c.id) {
          rank = 4;
          reason = "Identificador explícito RecoveryCase";
        } else if (c.checkoutToken && order.checkoutToken === c.checkoutToken) {
          rank = 3;
          reason = "Token de checkout preservado no pedido";
        } else if (order.providerRelationshipId === c.externalCheckoutId) {
          rank = 2;
          reason = "Relação determinística do provedor";
        }
        const similarity = basket(c, order),
          amountDiff = Math.abs(c.totalCents - order.netCents) / Math.max(c.totalCents, 1);
        if (
          !rank &&
          (options.allowIdentityBasketMatch ?? RECOVERY_RULES.allowIdentityBasketMatch) &&
          c.customer.customerId &&
          c.customer.customerId === order.customerId &&
          similarity >= RECOVERY_RULES.minimumBasketSimilarity &&
          amountDiff <= RECOVERY_RULES.maximumAmountDifference
        ) {
          rank = 1;
          reason = "Identidade estável, janela, cesta e valor compatíveis (opt-in)";
        }
        return rank
          ? [{ c, rank, reason, lag: paid - Date.parse(c.abandonedAt), similarity, amountDiff }]
          : [];
      })
      .sort(
        (a, b) =>
          b.rank - a.rank ||
          a.lag - b.lag ||
          b.similarity - a.similarity ||
          a.amountDiff - b.amountDiff ||
          a.c.id.localeCompare(b.c.id),
      );
    if (!candidates.length) {
      quality.unmatchedOrders++;
      continue;
    }
    const top = candidates[0];
    // Competing explicit identifiers are not resolved by a nearest-date guess.
    const ambiguous =
      candidates.filter((x) => x.rank >= 2).length > 1 ||
      (candidates[1] &&
        top.rank === candidates[1].rank &&
        top.lag === candidates[1].lag &&
        top.similarity === candidates[1].similarity &&
        top.amountDiff === candidates[1].amountDiff);
    if (ambiguous) {
      for (const { c } of candidates)
        c.match = {
          reason: "Mais de um checkout elegível com evidência equivalente ou conflitante.",
          confidence: "UNAVAILABLE",
          matchedAt: null,
          ambiguous: true,
        };
      quality.unmatchedOrders++;
      continue;
    }
    top.c.recoveredOrder = order;
    top.c.status = "RECOVERED";
    top.c.mature = true;
    top.c.match = {
      reason: top.reason,
      confidence: top.rank >= 2 ? "HIGH" : "MEDIUM",
      matchedAt: asOf,
      ambiguous: false,
    };
    top.c.attribution = resolver.resolve(order);
  }
  quality.unknownCustomers = cases.filter((c) => !c.customer.customerId).length;
  quality.missingSource = cases.filter((c) => c.acquisition.channel === "UNIDENTIFIED").length;
  quality.ambiguousCases = cases.filter((c) => c.match.ambiguous).length;
  quality.conflictingAttribution = cases.filter((c) => c.attribution.conflict).length;
  return { cases, quality };
}
