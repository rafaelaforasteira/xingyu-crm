import { describe, expect, it } from "vitest";
import { getPurchaseDistributionColor } from "./purchase-stage-presentation";

const red = "var(--tracking-data-red, #e63e46)";
const orange = "var(--tracking-data-orange, #f28a20)";
const yellow = "var(--tracking-data-yellow, #f4c542)";
const blue = "var(--tracking-data-blue, #3478f6)";
const green = "var(--tracking-data-green, #5dd62c)";

describe("purchase distribution magnitude colors", () => {
  it.each([[0, red], [29, red], [30, orange], [49, orange], [50, yellow], [79, yellow], [80, blue], [99, blue], [100, green], [115, green]])("maps the threshold boundary %s", (value, color) => {
    expect(getPurchaseDistributionColor(value as number)).toBe(color);
  });
  it("colors current volumes", () => {
    expect([57, 49, 37, 25, 38, 123].map(getPurchaseDistributionColor)).toEqual([yellow, orange, orange, red, orange, green]);
  });
  it("updates every category when volumes change", () => {
    expect([115, 83, 62, 45, 28, 74].map(getPurchaseDistributionColor)).toEqual([green, blue, yellow, orange, red, yellow]);
  });
});
