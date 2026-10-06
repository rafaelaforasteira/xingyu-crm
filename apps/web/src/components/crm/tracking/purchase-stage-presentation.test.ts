import { describe, expect, it } from "vitest";
import { purchaseStageFill } from "./purchase-stage-presentation";

describe("purchase stage presentation", () => {
  it("keeps the recurring category green even when another category leads", () => {
    const stages = [{ stage: "1ª", orders: 200 }, { stage: "6ª+", orders: 12 }];
    expect(stages.map(({ stage }) => purchaseStageFill(stage))).toEqual([
      "var(--purchase-stage-base, var(--tracking-data-charcoal, #3b3f42))",
      "var(--tracking-data-green, #5dd62c)",
    ]);
  });

  it("uses the same neutral identity for the first five purchases", () => {
    for (const stage of ["1ª", "2ª", "3ª", "4ª", "5ª"]) {
      expect(purchaseStageFill(stage)).toBe("var(--purchase-stage-base, var(--tracking-data-charcoal, #3b3f42))");
    }
  });
});
