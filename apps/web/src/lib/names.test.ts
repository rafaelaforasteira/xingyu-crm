import { describe, expect, it } from "vitest";
import {
  companyDisplayName,
  displayFirstName,
  fullName,
  joinDisplayName,
  splitDisplayName,
} from "./names";

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

describe("displayFirstName", () => {
  it("returns the first token of a full name", () => {
    expect(displayFirstName("Raffaela Forasteira")).toBe("Raffaela");
    expect(displayFirstName("Administradora Xingyu")).toBe("Administradora");
    expect(displayFirstName("Cris Santos Oliveira")).toBe("Cris");
    expect(displayFirstName("Deise")).toBe("Deise");
  });

  it("handles empty and messy input", () => {
    expect(displayFirstName(null)).toBe("Usuário");
    expect(displayFirstName(undefined)).toBe("Usuário");
    expect(displayFirstName("   ")).toBe("Usuário");
    expect(displayFirstName("  Raffaela   Forasteira  ")).toBe("Raffaela");
  });
});

describe("splitDisplayName / joinDisplayName", () => {
  it("splits and rejoins full names", () => {
    expect(splitDisplayName("Raffaela Forasteira")).toEqual({
      firstName: "Raffaela",
      lastName: "Forasteira",
    });
    expect(joinDisplayName("Raffaela", "Forasteira")).toBe("Raffaela Forasteira");
  });

  it("handles single names", () => {
    expect(splitDisplayName("Deise")).toEqual({ firstName: "Deise", lastName: "" });
    expect(joinDisplayName("Deise", "")).toBe("Deise");
  });
});
