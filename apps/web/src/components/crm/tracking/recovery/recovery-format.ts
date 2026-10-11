import { compactMoney, money, percentage } from "../tracking-format";
export const recoveryMoney = (cents: number | null) => money(cents == null ? null : cents / 100);
export const recoveryCompactMoney = (cents: number | null) =>
  compactMoney(cents == null ? null : cents / 100);
export const recoveryPercent = percentage;
export const recoveryHours = (hours: number | null) =>
  hours == null
    ? "—"
    : hours < 24
      ? `${hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`
      : `${(hours / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
export function recoveryComparison(value: number | null, previous: number | null, points = false) {
  if (value == null || previous == null || (!points && previous === 0)) return null;
  return points ? value - previous : ((value - previous) / previous) * 100;
}
