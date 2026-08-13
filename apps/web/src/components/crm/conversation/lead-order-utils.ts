import type { Order } from "@/lib/types";

const PAID_ORDER_STATUSES = new Set([
  "PAYMENT_APPROVED",
  "SEPARATING",
  "IN_PRODUCTION",
  "LEFT_FACTORY",
  "INTERNATIONAL_TRANSPORT",
  "ARRIVED_BRAZIL",
  "NATIONAL_TRANSPORT",
  "DELIVERED",
  "AFTER_SALES_STARTED",
  "COMPLETED",
]);

export function orderTotal(order: Order) {
  return Number(order.finalValue ?? order.total ?? 0);
}

export function orderDate(order: Order) {
  return order.orderedAt ?? order.placedAt ?? order.createdAt ?? null;
}

export function orderPaidAt(order: Order) {
  const approved = order.payments
    ?.filter((payment) => payment.status === "APPROVED" && payment.paidAt)
    .sort((a, b) => String(a.paidAt).localeCompare(String(b.paidAt)))[0];
  return approved?.paidAt ?? null;
}

export function eligiblePurchaseAt(order: Order): Date | null {
  const financial = order.financialStatus?.toUpperCase();
  if (order.status === "CANCELLED" || financial?.includes("REFUND") || financial === "CANCELLED")
    return null;
  const paidAt = orderPaidAt(order);
  if (paidAt) return new Date(paidAt);
  if (!PAID_ORDER_STATUSES.has(order.status)) return null;
  const fallback = orderDate(order);
  return fallback ? new Date(fallback) : null;
}

export function averagePurchaseInterval(orders: Order[]) {
  const timestamps = orders
    .map(eligiblePurchaseAt)
    .filter((date): date is Date => Boolean(date && !Number.isNaN(date.getTime())))
    .sort((a, b) => a.getTime() - b.getTime());
  if (timestamps.length < 2) return null;
  const intervals = timestamps
    .slice(1)
    .map((date, index) => date.getTime() - timestamps[index]!.getTime());
  const averageMs = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
  const days = averageMs / 86_400_000;
  return {
    averageMs,
    days,
    eligibleCount: timestamps.length,
    label: days < 1 ? "< 1 dia" : `~ ${Math.round(days)} dias`,
  };
}

export function sortOrdersNewestFirst(orders: Order[]) {
  return [...orders].sort(
    (a, b) => new Date(orderDate(b) ?? 0).getTime() - new Date(orderDate(a) ?? 0).getTime(),
  );
}
