/**
 * Closed-deal conversion for the dashboard decision center.
 *
 * Definition:
 *   WON / (WON + LOST)
 * where both counts use deals with `closedAt` inside the selected period.
 *
 * OPEN deals are excluded. If there are no closed deals, the rate is `null`
 * (never coerced to 0%).
 *
 * This is NOT a cohort conversion of deals created in the period.
 */
export function closedDealConversionRate(won: number, lost: number): number | null {
  const closed = won + lost;
  if (closed <= 0) return null;
  return Math.round((won / closed) * 1000) / 10;
}

export function closedDealConversionDeltaPp(
  current: number | null,
  previous: number | null,
): number | null {
  if (current == null || previous == null) return null;
  return Math.round((current - previous) * 10) / 10;
}
