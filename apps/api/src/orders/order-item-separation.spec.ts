import { NotFoundException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { OrdersService } from "./orders.service";

describe("order item separation", () => {
  const findFirst = jest.fn();
  const update = jest.fn();
  const service = new OrdersService({ orderItem: { findFirst, update } } as never);

  beforeEach(() => jest.clearAllMocks());

  it("scopes the item lookup to the order and organization", async () => {
    findFirst.mockResolvedValue({ id: "item-1" });
    update.mockResolvedValue({ id: "item-1", isSeparated: true });
    await service.updateItemSeparation("org-1", "order-1", "item-1", true);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "item-1",
        orderId: "order-1",
        order: { organizationId: "org-1", deletedAt: null },
      },
      select: { id: true },
    });
  });

  it("rejects an item that does not belong to the scoped order", async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      service.updateItemSeparation("org-1", "order-1", "foreign-item", true),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it("sets and clears the separation timestamp without changing the order", async () => {
    findFirst.mockResolvedValue({ id: "item-1" });
    update.mockResolvedValue({ id: "item-1" });
    await service.updateItemSeparation("org-1", "order-1", "item-1", true);
    expect(update.mock.calls[0][0].data.isSeparated).toBe(true);
    expect(update.mock.calls[0][0].data.separatedAt).toBeInstanceOf(Date);
    await service.updateItemSeparation("org-1", "order-1", "item-1", false);
    expect(update.mock.calls[1][0].data).toEqual({ isSeparated: false, separatedAt: null });
  });

  it("keeps controller-level order access protection on the item endpoint", () => {
    const controller = readFileSync("src/orders/orders.controller.ts", "utf8");
    const endpoint = controller.slice(
      controller.indexOf('@Patch(":orderId/items/:itemId")'),
      controller.indexOf('@Delete(":id")'),
    );
    expect(endpoint).toContain("assertOrderAccess(user, orderId)");
    expect(endpoint).toContain("updateItemSeparation(orgId, orderId, itemId");
  });
});
