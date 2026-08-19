import { OrderStatus, PaymentStatus } from "@xingyu/database";
import { customerStatus, isQualifyingPurchase, normalizeCountry, normalizeState, recencyBucket } from "./customer-profile.domain";

describe("customer profile domain", () => {
  it("derives lead, customer and recurring from valid purchases", () => { expect(customerStatus(0)).toBe("LEAD"); expect(customerStatus(1)).toBe("CUSTOMER"); expect(customerStatus(2)).toBe("RECURRING"); });
  it("excludes cancelled and refunded-only orders", () => { expect(isQualifyingPurchase({ status: OrderStatus.CANCELLED })).toBe(false); expect(isQualifyingPurchase({ status: OrderStatus.ORDER_PLACED, payments: [{ status: PaymentStatus.REFUNDED }] })).toBe(false); expect(isQualifyingPurchase({ status: OrderStatus.PAYMENT_APPROVED, payments: [{ status: PaymentStatus.APPROVED }] })).toBe(true); });
  it("normalizes Brazilian geography", () => { expect(normalizeState("Minas Gerais")).toBe("MG"); expect(normalizeCountry("Brazil", null)).toBe("BR"); expect(normalizeCountry(null, "SP")).toBe("BR"); });
  it("buckets never purchased profiles", () => expect(recencyBucket(null)).toBe("never"));
});
