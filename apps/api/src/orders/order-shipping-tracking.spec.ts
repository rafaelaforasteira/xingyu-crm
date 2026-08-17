import { NotFoundException } from "@nestjs/common";
import { OrdersService } from "./orders.service";

describe("order shipping tracking", () => {
  const findFirst = jest.fn();
  const update = jest.fn();
  const eventCreate = jest.fn();
  const shipmentUpdate = jest.fn();
  const transaction = jest.fn(async (run: (tx: unknown) => unknown) =>
    run({ shipmentEvent: { create: eventCreate }, shipment: { update: shipmentUpdate } }),
  );
  const service = new OrdersService({
    shipment: { findFirst, update },
    shipmentEvent: { findUnique: jest.fn() },
    $transaction: transaction,
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it("records the first tracking issuance and preserves it on later edits", async () => {
    findFirst.mockResolvedValueOnce({ id: "shipment-1", trackingIssuedAt: null });
    update.mockResolvedValue({ id: "shipment-1" });
    await service.updateShipment("org-1", "order-1", "shipment-1", { trackingCode: " X-1 " });
    expect(update.mock.calls[0][0].data.trackingCode).toBe("X-1");
    expect(update.mock.calls[0][0].data.trackingIssuedAt).toBeInstanceOf(Date);
    findFirst.mockResolvedValueOnce({ id: "shipment-1", trackingIssuedAt: new Date("2026-01-01") });
    await service.updateShipment("org-1", "order-1", "shipment-1", { trackingCode: "X-2" });
    expect(update.mock.calls[1][0].data).not.toHaveProperty("trackingIssuedAt");
  });

  it("persists posting independently from tracking", async () => {
    findFirst.mockResolvedValue({ id: "shipment-1", trackingIssuedAt: null });
    update.mockResolvedValue({ id: "shipment-1" });
    await service.updateShipment("org-1", "order-1", "shipment-1", { postedAt: "2026-08-17T12:00:00Z" });
    expect(update.mock.calls[0][0].data).toEqual({ postedAt: new Date("2026-08-17T12:00:00Z") });
  });

  it("rejects a shipment outside the scoped order and organization", async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.updateShipment("org-1", "order-1", "foreign", { trackingCode: "X" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("uses DELIVERED occurredAt without updating the order stage", async () => {
    const deliveredAt = "2026-08-17T14:30:00Z";
    findFirst.mockResolvedValue({ id: "shipment-1", deliveredAt: null });
    eventCreate.mockResolvedValue({ id: "event-1" });
    await service.addShipmentEvent("org-1", "order-1", "shipment-1", { status: "DELIVERED", occurredAt: deliveredAt });
    expect(shipmentUpdate).toHaveBeenCalledWith({ where: { id: "shipment-1" }, data: { deliveredAt: new Date(deliveredAt), status: "DELIVERED" } });
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
