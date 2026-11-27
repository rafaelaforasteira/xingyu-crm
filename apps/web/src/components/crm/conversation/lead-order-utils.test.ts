import { describe, expect, it } from "vitest";
import type { Order } from "@/lib/types";
import {
  averagePurchaseInterval,
  eligiblePurchaseAt,
  orderTotal,
  sortOrdersNewestFirst,
} from "./lead-order-utils";

const order = (id: string, orderedAt: string, status = "COMPLETED"): Order => ({
  id,
  number: id,
  status,
  orderedAt,
  finalValue: "100",
});

describe("lead order history helpers", () => {
  it("calculates the arithmetic mean between consecutive valid purchases", () => {
    const result = averagePurchaseInterval([
      order("1", "2026-01-01T00:00:00Z"),
      order("2", "2026-01-11T00:00:00Z"),
      order("3", "2026-01-31T00:00:00Z"),
    ]);
    expect(result?.days).toBe(15);
    expect(result?.eligibleCount).toBe(3);
  });

  it("prefers paidAt and excludes cancelled and refunded orders", () => {
    const paid = {
      ...order("paid", "2026-01-01T00:00:00Z"),
      payments: [
        { id: "p", amount: 100, method: "PIX", status: "APPROVED", paidAt: "2026-01-03T00:00:00Z" },
      ],
    };
    expect(eligiblePurchaseAt(paid)?.toISOString()).toBe("2026-01-03T00:00:00.000Z");
    expect(eligiblePurchaseAt(order("cancelled", "2026-01-01T00:00:00Z", "CANCELLED"))).toBeNull();
    expect(
      eligiblePurchaseAt({
        ...order("refund", "2026-01-01T00:00:00Z"),
        financialStatus: "REFUNDED",
      }),
    ).toBeNull();
  });

  it("hides KPI below two purchases, formats sub-day values and sorts newest first", () => {
    expect(averagePurchaseInterval([order("1", "2026-01-01T00:00:00Z")])).toBeNull();
    expect(
      averagePurchaseInterval([
        order("1", "2026-01-01T00:00:00Z"),
        order("2", "2026-01-01T12:00:00Z"),
      ])?.label,
    ).toBe("< 1 dia");
    expect(
      sortOrdersNewestFirst([
        order("old", "2026-01-01T00:00:00Z"),
        order("new", "2026-02-01T00:00:00Z"),
      ])[0]?.id,
    ).toBe("new");
    expect(orderTotal(order("1", "2026-01-01T00:00:00Z"))).toBe(100);
  });
});
