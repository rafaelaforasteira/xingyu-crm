import { FinanceService, resolveFinancePeriod } from "./finance.service";

describe("FinanceService", () => {
  it("resolves a custom period with an exclusive end date", () => {
    const range = resolveFinancePeriod({ period: "custom", from: "2026-08-10", to: "2026-08-12" });
    expect(range.start.toISOString()).toBe("2026-08-10T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-13T00:00:00.000Z");
  });

  it("aggregates revenue, receivables, reconciliation and commission bases", async () => {
    const prisma = {
      order: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "order-1",
            number: "XY-1",
            ownerId: "user-1",
            owner: { id: "user-1", name: "Juliana", avatarUrl: null },
            orderedAt: new Date("2026-08-12T12:00:00.000Z"),
            grossValue: 1000,
            discount: 100,
            shippingCost: 50,
            taxes: 20,
            finalValue: 950,
            coupon: "BEMVINDO",
            financialStatus: "PAID",
            status: "PAYMENT_APPROVED",
            payments: [{
              id: "payment-1",
              amount: 950,
              method: "PIX",
              status: "APPROVED",
              paidAt: new Date("2026-08-12T13:00:00.000Z"),
              dueAt: null,
              receiptUrl: "https://example.test/receipt.pdf",
              createdAt: new Date("2026-08-12T13:00:00.000Z"),
            }],
          },
          {
            id: "order-2",
            number: "XY-2",
            ownerId: null,
            owner: null,
            orderedAt: new Date("2026-08-13T12:00:00.000Z"),
            grossValue: 500,
            discount: 0,
            shippingCost: 0,
            taxes: 0,
            finalValue: 500,
            coupon: null,
            financialStatus: "PENDING",
            status: "AWAITING_PAYMENT",
            payments: [{
              id: "payment-2",
              amount: 500,
              method: "BOLETO",
              status: "PENDING",
              paidAt: null,
              dueAt: new Date("2026-08-01T00:00:00.000Z"),
              receiptUrl: null,
              createdAt: new Date("2026-08-13T12:00:00.000Z"),
            }],
          },
        ]),
      },
    };
    const service = new FinanceService(prisma as never);
    const result = await service.workspace("org-1", { period: "30d" });

    expect(result.metrics).toMatchObject({
      grossRevenue: 1500,
      discounts: 100,
      netSales: 1450,
      received: 950,
      receivable: 500,
      overdue: 500,
      orderCount: 2,
    });
    expect(result.reconciliation).toEqual(expect.arrayContaining([
      expect.objectContaining({ orderNumber: "XY-1", status: "MATCHED" }),
      expect.objectContaining({ orderNumber: "XY-2", status: "PENDING" }),
    ]));
    expect(result.commissions[0]).toMatchObject({
      ownerName: "Juliana",
      eligibleRevenue: 950,
      status: "RULE_REQUIRED",
      commission: null,
    });
  });
});
