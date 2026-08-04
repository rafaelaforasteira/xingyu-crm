/**
 * Centralized repurchase inactivity bands.
 *
 * Reactivation (typically >120 days / inactive status) must stay separate.
 */

export type RepurchaseBandId =
  | "0_30"
  | "31_60"
  | "61_90"
  | "91_120"
  | "120_plus";

export interface RepurchaseBand {
  id: RepurchaseBandId;
  label: string;
  /** Inclusive lower bound (days without purchase). */
  minDays: number;
  /** Inclusive upper bound; `null` means open-ended. */
  maxDays: number | null;
}

export const REPURCHASE_BANDS: readonly RepurchaseBand[] = [
  { id: "0_30", label: "Até 30 dias", minDays: 0, maxDays: 30 },
  { id: "31_60", label: "31 a 60 dias", minDays: 31, maxDays: 60 },
  { id: "61_90", label: "61 a 90 dias", minDays: 61, maxDays: 90 },
  { id: "91_120", label: "91 a 120 dias", minDays: 91, maxDays: 120 },
  { id: "120_plus", label: "Mais de 120 dias", minDays: 121, maxDays: null },
] as const;

/**
 * Dashboard "Prontos para recompra" includes contacts with at least one order
 * whose daysWithoutPurchase falls in [30, 90] — i.e. the upper edge of "Até 30 dias"
 * plus the full "31 a 60" and "61 a 90" bands.
 */
export const DASHBOARD_REPURCHASE_READY_MIN_DAYS = 30;
export const DASHBOARD_REPURCHASE_READY_MAX_DAYS = 90;

export const DASHBOARD_REPURCHASE_READY_BAND_IDS: readonly RepurchaseBandId[] = [
  "0_30",
  "31_60",
  "61_90",
];

/** Contacts above this threshold are treated as reactivation candidates, not repurchase-ready. */
export const REACTIVATION_INACTIVE_MIN_DAYS = 121;

export function resolveRepurchaseBand(daysWithoutPurchase: number): RepurchaseBand | null {
  if (!Number.isFinite(daysWithoutPurchase) || daysWithoutPurchase < 0) return null;
  return (
    REPURCHASE_BANDS.find((band) => {
      if (daysWithoutPurchase < band.minDays) return false;
      if (band.maxDays == null) return true;
      return daysWithoutPurchase <= band.maxDays;
    }) ?? null
  );
}

export function isRepurchaseReady(daysWithoutPurchase: number, orderCount: number): boolean {
  if (orderCount <= 0) return false;
  return (
    daysWithoutPurchase >= DASHBOARD_REPURCHASE_READY_MIN_DAYS &&
    daysWithoutPurchase <= DASHBOARD_REPURCHASE_READY_MAX_DAYS
  );
}

export function repurchaseReadyPrismaFilter() {
  return {
    daysWithoutPurchase: {
      gte: DASHBOARD_REPURCHASE_READY_MIN_DAYS,
      lte: DASHBOARD_REPURCHASE_READY_MAX_DAYS,
    },
    orderCount: { gt: 0 },
  };
}

export function repurchaseReadyDescription(): string {
  return `Faixas incluídas: ${DASHBOARD_REPURCHASE_READY_BAND_IDS.map((id) => {
    const band = REPURCHASE_BANDS.find((item) => item.id === id);
    return band?.label ?? id;
  }).join(", ")} (somente a partir de ${DASHBOARD_REPURCHASE_READY_MIN_DAYS} dias), com pelo menos um pedido.`;
}
