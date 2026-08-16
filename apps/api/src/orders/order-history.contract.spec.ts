import { readFileSync } from "node:fs";

describe("order history persistence contract", () => {
  const schema = readFileSync("../../packages/database/prisma/schema.prisma", "utf8");
  const service = readFileSync("src/orders/orders.service.ts", "utf8");

  it("persists customer, address and tracking snapshots per order", () => {
    for (const field of [
      "customerNameSnapshot",
      "customerEmailSnapshot",
      "customerPhoneSnapshot",
      "address1Snapshot",
      "citySnapshot",
      "trackingSourceSnapshot",
      "landingPageSnapshot",
      "referrerSnapshot",
    ]) {
      expect(schema).toContain(field);
      expect(service).toContain(field);
    }
  });

  it("preserves external item identity and immutable order events", () => {
    expect(schema).toContain("model OrderEvent");
    expect(schema).toContain("externalProductId");
    expect(schema).toContain("externalVariantId");
    expect(schema).toContain("purchaseOrdinal");
  });

  it("records every editable operational dimension", () => {
    for (const eventType of [
      "OPERATIONAL_STAGE_CHANGED",
      "OPERATIONAL_ASSIGNEE_CHANGED",
      "OPERATIONAL_PRIORITY_CHANGED",
      "OPERATIONAL_DUE_DATE_CHANGED",
      "CURRENT_LOCATION_CHANGED",
      "OPERATIONAL_ISSUE_CHANGED",
      "ORDER_CUSTOMER_DETAILS_UPDATED",
      "ORDER_SHIPPING_ADDRESS_UPDATED",
    ])
      expect(service).toContain(eventType);
  });
});
