import { interpolate } from "./expressions";
import { asConditionGroup, evaluateGroup, evaluateItem } from "./conditions";

describe("automation expressions", () => {
  it("interpolates CRM fields without eval", () => {
    expect(interpolate("Olá {{contact.firstName}}", { contact: { firstName: "Amanda" } })).toBe("Olá Amanda");
  });

  it("supports lowercase helper", () => {
    expect(interpolate("{{lowercase(contact.firstName)}}", { contact: { firstName: "Mayara" } })).toBe("mayara");
  });

  it("does not execute arbitrary javascript", () => {
    expect(interpolate("{{unknown.path}}", {})).toBeUndefined();
    expect(interpolate("Olá {{contact.firstName}}", { contact: { firstName: "A" } })).toBe("Olá A");
  });
});

describe("automation conditions", () => {
  it("evaluates AND groups", () => {
    expect(evaluateGroup({
      logic: "AND",
      items: [
        { field: "deal.value", operator: "GREATER_THAN", value: 500 },
        { field: "deal.status", operator: "EQUALS", value: "OPEN" },
      ],
    }, { deal: { value: 1200, status: "OPEN" } })).toBe(true);
  });

  it("supports contains", () => {
    expect(evaluateItem({ field: "contact.name", operator: "CONTAINS", value: "van" }, { contact: { name: "Vanessa" } })).toBe(true);
  });

  it("treats missing items as an empty group", () => {
    expect(evaluateGroup(asConditionGroup({ logic: "AND" }), {})).toBe(true);
  });
});
