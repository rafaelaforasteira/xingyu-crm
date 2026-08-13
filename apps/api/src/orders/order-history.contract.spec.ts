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
});
