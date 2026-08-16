import { describe, expect, it } from "vitest";
import { formatOrderCurrency, orderEnumLabel, orderText, stageLabel } from "./orders-i18n";

describe("orders localization", () => {
  it("provides complete navigation copy in every supported locale", () => {
    for (const locale of ["pt-BR", "en", "zh-CN", "zh-HK"] as const) {
      expect(orderText(locale).newOrder).toBeTruthy();
      expect(orderText(locale).stagesTitle).toBeTruthy();
      expect(orderText(locale).orderSummary).toBeTruthy();
      expect(orderText(locale).paymentReceipt).toBeTruthy();
      expect(orderText(locale).marketingAttribution).toBeTruthy();
      expect(orderText(locale).timeline).toBeTruthy();
      expect(orderEnumLabel("PAID", locale)).not.toBe("PAID");
    }
  });

  it("uses translated stage names with a safe Portuguese fallback", () => {
    const stage = { name: "Produção", translations: { en: "Production", "pt-BR": "Produção" } };
    expect(stageLabel(stage as never, "en")).toBe("Production");
    expect(stageLabel(stage as never, "zh-CN")).toBe("Produção");
  });

  it("formats money according to locale and currency", () => {
    expect(formatOrderCurrency(1000, "USD", "en")).toContain("1,000");
    expect(formatOrderCurrency(1000, "BRL", "pt-BR")).toContain("1.000");
  });

  it("never exposes the persisted order status enum values", () => {
    const statuses = [
      "ORDER_PLACED",
      "AWAITING_PAYMENT",
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
      "CANCELLED",
    ];
    for (const locale of ["pt-BR", "en", "zh-CN", "zh-HK"] as const)
      for (const status of statuses) expect(orderEnumLabel(status, locale)).not.toBe(status);
  });
});
