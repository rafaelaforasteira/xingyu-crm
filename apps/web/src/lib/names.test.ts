import { describe, expect, it } from "vitest";
import { companyDisplayName, fullName } from "./names";

describe("names", () => {
  it("builds fullName from first and last", () => {
    expect(fullName("Ana", "Silva")).toBe("Ana Silva");
    expect(fullName("Ana", null)).toBe("Ana");
    expect(fullName("Ana", "")).toBe("Ana");
    expect(fullName(null, "Silva")).toBe("Silva");
    expect(fullName()).toBe("");
  });

  it("prefers trade name for company display", () => {
    expect(companyDisplayName("Razao LTDA", "Marca")).toBe("Marca");
    expect(companyDisplayName("Razao LTDA", null)).toBe("Razao LTDA");
    expect(companyDisplayName(null, "Marca")).toBe("Marca");
    expect(companyDisplayName()).toBe("");
  });
});
