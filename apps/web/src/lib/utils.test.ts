import { describe, it, expect } from "vitest";
import { cn, formatCurrency, initials } from "./utils";

describe("utils", () => {
  it("merges class names", () => {
    expect(cn("px-2", "px-4")).toContain("px-4");
  });

  it("formats BRL currency", () => {
    expect(formatCurrency(1500)).toMatch(/1\.500/);
  });

  it("builds initials", () => {
    expect(initials("Raffaela Silva")).toBe("RS");
  });
});
