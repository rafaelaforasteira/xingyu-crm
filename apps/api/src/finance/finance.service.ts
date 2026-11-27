import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

type FinanceFilters = { period?: string; from?: string; to?: string };

const PAID_FINANCIAL_STATUSES = new Set(["PAID", "APPROVED", "PAYMENT_APPROVED", "PAGO"]);
const CANCELLED_ORDER_STATUSES = new Set(["CANCELLED"]);

function amount(value: unknown): number {
  return Number(value ?? 0);
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveFinancePeriod(filters: FinanceFilters, now = new Date()) {
  const end = new Date(now);
  let start = new Date(now);
  const period = filters.period ?? "month";
  if (period === "custom") {
    const customStart = validDate(filters.from);
    const customEnd = validDate(filters.to);
    if (customStart && customEnd) {
      const ordered = customStart <= customEnd
        ? [customStart, customEnd]
        : [customEnd, customStart];
      const exclusiveEnd = new Date(ordered[1]);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      return { start: ordered[0], end: exclusiveEnd, period };
    }
  }
  if (period === "today") start.setUTCHours(0, 0, 0, 0);
  else if (period === "7d") start.setUTCDate(start.getUTCDate() - 7);
  else if (period === "30d") start.setUTCDate(start.getUTCDate() - 30);
  else if (period === "previous-month") {
    end.setUTCDate(1);
    end.setUTCHours(0, 0, 0, 0);
    start = new Date(end);
    start.setUTCMonth(start.getUTCMonth() - 1);
  } else {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
  }
  return { start, end, period };
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async workspace(organizationId: string, filters: FinanceFilters) {
    const range = resolveFinancePeriod(filters);
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        deletedAt: null,
        orderedAt: { gte: range.start, lt: range.end },
      },
      orderBy: { orderedAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        payments: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      },
    });

    let grossRevenue = 0;
    let discounts = 0;
    let shipping = 0;
    let taxes = 0;
    let netSales = 0;
    let received = 0;
    let refunded = 0;
    let cancelled = 0;
    let overdue = 0;
    let missingReceipts = 0;
    const methods = new Map<string, { method: string; amount: number; count: number }>();
    const days = new Map<string, { label: string; gross: number; net: number; received: number }>();
    const commissionOwners = new Map<string, {
      ownerId: string | null;
      ownerName: string;
      avatarUrl: string | null;
      orders: number;
      eligibleRevenue: number;
    }>();

    const revenues = orders.map((order) => {
      const approved = order.payments
        .filter((payment) => payment.status === "APPROVED")
        .reduce((sum, payment) => sum + amount(payment.amount), 0);
      const orderRefunded = order.payments
        .filter((payment) => payment.status === "REFUNDED")
        .reduce((sum, payment) => sum + amount(payment.amount), 0);
      const isPaid = approved > 0 || PAID_FINANCIAL_STATUSES.has(order.financialStatus ?? "");
      const expected = amount(order.finalValue);
      const openAmount = Math.max(expected - approved, 0);
      const dueDates = order.payments.map((payment) => payment.dueAt).filter(Boolean) as Date[];
      const dueAt = dueDates.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
      const isOverdue = openAmount > 0 && (
        order.payments.some((payment) => payment.status === "OVERDUE") ||
        Boolean(dueAt && dueAt < new Date())
      );
      const cancelledOrder = CANCELLED_ORDER_STATUSES.has(order.status);

      grossRevenue += amount(order.grossValue);
      discounts += amount(order.discount);
      shipping += amount(order.shippingCost);
      taxes += amount(order.taxes);
      netSales += expected;
      received += approved;
      refunded += orderRefunded;
      if (cancelledOrder) cancelled += expected;
      if (isOverdue) overdue += openAmount;
      missingReceipts += order.payments.filter(
        (payment) => payment.status === "APPROVED" && !payment.receiptUrl,
      ).length;

      for (const payment of order.payments) {
        const entry = methods.get(payment.method) ?? { method: payment.method, amount: 0, count: 0 };
        entry.amount += amount(payment.amount);
        entry.count += 1;
        methods.set(payment.method, entry);
      }
      const dayKey = order.orderedAt.toISOString().slice(0, 10);
      const day = days.get(dayKey) ?? { label: dayKey, gross: 0, net: 0, received: 0 };
      day.gross += amount(order.grossValue);
      day.net += expected;
      day.received += approved;
      days.set(dayKey, day);

      if (isPaid && !cancelledOrder) {
        const ownerKey = order.ownerId ?? "unassigned";
        const owner = commissionOwners.get(ownerKey) ?? {
          ownerId: order.ownerId,
          ownerName: order.owner?.name ?? "Sem responsável",
          avatarUrl: order.owner?.avatarUrl ?? null,
          orders: 0,
          eligibleRevenue: 0,
        };
        owner.orders += 1;
        owner.eligibleRevenue += Math.max(approved - orderRefunded, 0);
        commissionOwners.set(ownerKey, owner);
      }

      return {
        id: order.id,
        number: order.number,
        orderedAt: order.orderedAt,
        owner: order.owner,
        grossValue: round(amount(order.grossValue)),
        discount: round(amount(order.discount)),
        coupon: order.coupon,
        shippingCost: round(amount(order.shippingCost)),
        taxes: round(amount(order.taxes)),
        finalValue: round(expected),
        financialStatus: order.financialStatus,
        orderStatus: order.status,
        paymentMethod: order.payments[0]?.method ?? null,
        paidAmount: round(approved),
        openAmount: round(openAmount),
        dueAt,
        paidAt: order.payments.find((payment) => payment.status === "APPROVED")?.paidAt ?? null,
        isOverdue,
        hasReceipt: order.payments.some((payment) => Boolean(payment.receiptUrl)),
      };
    });

    const reconciliation = revenues.map((row) => {
      const difference = round(row.finalValue - row.paidAmount);
      return {
        orderId: row.id,
        orderNumber: row.number,
        expected: row.finalValue,
        received: row.paidAmount,
        difference,
        status: Math.abs(difference) <= 0.01 ? "MATCHED" : row.paidAmount === 0 ? "PENDING" : "DIVERGENT",
      };
    });
    const divergences = reconciliation.filter((row) => row.status === "DIVERGENT").length;
    const pendingReconciliation = reconciliation.filter((row) => row.status === "PENDING").length;
    const receivables = revenues.filter((row) => row.openAmount > 0 && row.orderStatus !== "CANCELLED");

    return {
      generatedAt: new Date(),
      period: { ...range, label: range.period },
      metrics: {
        grossRevenue: round(grossRevenue),
        discounts: round(discounts),
        shipping: round(shipping),
        taxes: round(taxes),
        netSales: round(netSales),
        received: round(received),
        receivable: round(receivables.reduce((sum, row) => sum + row.openAmount, 0)),
        overdue: round(overdue),
        refunded: round(refunded),
        cancelled: round(cancelled),
        orderCount: orders.length,
      },
      revenues,
      receivables,
      reconciliation,
      commissions: Array.from(commissionOwners.values())
        .map((row) => ({ ...row, eligibleRevenue: round(row.eligibleRevenue), rate: null, commission: null, status: "RULE_REQUIRED" }))
        .sort((a, b) => b.eligibleRevenue - a.eligibleRevenue),
      paymentMethods: Array.from(methods.values())
        .map((row) => ({ ...row, amount: round(row.amount) }))
        .sort((a, b) => b.amount - a.amount),
      revenueTimeline: Array.from(days.values())
        .map((row) => ({ ...row, gross: round(row.gross), net: round(row.net), received: round(row.received) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      closing: {
        ready: divergences === 0 && pendingReconciliation === 0 && missingReceipts === 0,
        divergences,
        pendingReconciliation,
        missingReceipts,
        approvedPayments: orders.flatMap((order) => order.payments).filter((payment) => payment.status === "APPROVED").length,
        receipts: orders.flatMap((order) => order.payments).filter((payment) => Boolean(payment.receiptUrl)).length,
      },
    };
  }
}
