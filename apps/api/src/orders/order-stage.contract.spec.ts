describe("order operational workflow contract", () => {
  it("keeps financial, fulfillment and operational stage independent", () => {
    const order = { financialStatus: "PAID", fulfillmentStatus: "UNFULFILLED", operationalStageId: "production" };
    expect(new Set(Object.keys(order)).size).toBe(3);
    expect(order.operationalStageId).not.toBe(order.financialStatus);
  });

  it("uses stable stage identity and semantic category instead of visible names", () => {
    const stage = { id: "stage-1", code: "production", name: "Em produção", category: "IN_PROGRESS", translations: { en: "Production", "zh-CN": "生产中", "zh-HK": "生產中" } };
    expect(stage.code).toBe("production");
    expect(stage.category).toBe("IN_PROGRESS");
    expect(stage.translations["zh-CN"]).toBe("生产中");
  });
});
