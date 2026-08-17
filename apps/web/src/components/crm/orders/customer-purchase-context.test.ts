import { describe, expect, it } from "vitest";
import { getCustomerPurchaseContext } from "./customer-purchase-context";

describe("customer purchase context", () => {
  it("prioritizes the explicit first-purchase signal", () => {
    expect(
      getCustomerPurchaseContext(
        { isFirstPurchase: true, purchaseOrdinal: 8, orderCount: 20 },
        "pt-BR",
      ),
    ).toEqual({ kind: "new", detail: "primeira compra registrada" });
  });

  it("uses the purchase ordinal without treating it as previous orders", () => {
    expect(getCustomerPurchaseContext({ purchaseOrdinal: 20 }, "pt-BR")).toEqual({
      kind: "returning",
      detail: "20ª compra",
    });
    expect(getCustomerPurchaseContext({ purchaseOrdinal: 22 }, "en")?.detail).toBe(
      "22nd purchase",
    );
  });

  it("uses the known total count only when stronger order signals are absent", () => {
    expect(getCustomerPurchaseContext({ orderCount: 20 }, "pt-BR")).toEqual({
      kind: "returning",
      detail: "20 pedidos",
    });
    expect(getCustomerPurchaseContext({ orderCount: 1 }, "en")).toEqual({
      kind: "new",
      detail: "first purchase recorded",
    });
  });

  it("supports Chinese sentence structures without Portuguese concatenation", () => {
    expect(getCustomerPurchaseContext({ purchaseOrdinal: 3 }, "zh-CN")?.detail).toBe(
      "第 3 次购买",
    );
    expect(getCustomerPurchaseContext({ orderCount: 4 }, "zh-HK")?.detail).toBe("4 張訂單");
  });

  it("keeps a confirmed returning state without inventing a count", () => {
    expect(getCustomerPurchaseContext({ isFirstPurchase: false }, "pt-BR")).toEqual({
      kind: "returning",
    });
  });

  it("hides the component when signals are insufficient", () => {
    expect(getCustomerPurchaseContext({}, "pt-BR")).toBeNull();
    expect(getCustomerPurchaseContext({ orderCount: 0 }, "pt-BR")).toBeNull();
  });
});
