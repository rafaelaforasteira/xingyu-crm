import { describe, expect, it } from "vitest";
import {
  formatPhoneForDisplay,
  formatPrimaryPhoneForDisplay,
  resolvePrimaryPhone,
} from "@/lib/format-phone-display";

describe("formatPhoneForDisplay", () => {
  it("formats Brazilian mobile with 9 digits", () => {
    expect(formatPhoneForDisplay("+5547988334464")).toBe(
      "+55 (47) 98833-4464",
    );
  });

  it("formats Brazilian landline with 8 digits and does not add 9", () => {
    expect(formatPhoneForDisplay("+554733334444")).toBe("+55 (47) 3333-4444");
    expect(formatPhoneForDisplay("+554733334444")).not.toContain("93333");
  });

  it("does not remove an existing ninth digit", () => {
    const result = formatPhoneForDisplay("+5547988334464");
    expect(result).toContain("98833");
    expect(digitsOf(result)).toBe("5547988334464");
  });

  it("does not add a ninth digit to 8-digit locals", () => {
    const result = formatPhoneForDisplay("+554733334444");
    expect(digitsOf(result)).toBe("554733334444");
    expect(result).toBe("+55 (47) 3333-4444");
  });

  it("accepts already formatted BR mobile without duplicating mask", () => {
    expect(formatPhoneForDisplay("+55 (47) 98833-4464")).toBe(
      "+55 (47) 98833-4464",
    );
  });

  it("ignores spaces and hyphens for parsing but keeps digits", () => {
    expect(formatPhoneForDisplay("+55 47 98833-4464")).toBe(
      "+55 (47) 98833-4464",
    );
    expect(digitsOf(formatPhoneForDisplay("+55 47 98833-4464"))).toBe(
      "5547988334464",
    );
  });

  it("does not apply Brazilian mask to non-BR international numbers", () => {
    expect(formatPhoneForDisplay("+14155552671")).toBe("+1 (415) 555-2671");
    expect(formatPhoneForDisplay("+14155552671")).toMatch(/\(\d{3}\)/);
  });

  it("returns a safe fallback when absent", () => {
    expect(formatPhoneForDisplay(null)).toBe("Telefone não informado");
    expect(formatPhoneForDisplay(undefined)).toBe("Telefone não informado");
    expect(formatPhoneForDisplay("")).toBe("Telefone não informado");
    expect(formatPhoneForDisplay("   ")).toBe("Telefone não informado");
  });

  it("does not throw on invalid input", () => {
    expect(() => formatPhoneForDisplay("abc")).not.toThrow();
    expect(formatPhoneForDisplay("abc")).toBe("abc");
  });
});

describe("resolvePrimaryPhone", () => {
  it("prefers contact.phone over whatsapp", () => {
    expect(
      resolvePrimaryPhone({
        phone: "+554733334444",
        whatsapp: "+5547988334464",
      }),
    ).toBe("+554733334444");
  });

  it("falls back to whatsapp", () => {
    expect(
      resolvePrimaryPhone({ phone: null, whatsapp: "+5547988334464" }),
    ).toBe("+5547988334464");
  });

  it("returns null when neither exists", () => {
    expect(resolvePrimaryPhone({ phone: null, whatsapp: null })).toBeNull();
    expect(resolvePrimaryPhone(null)).toBeNull();
  });
});

describe("formatPrimaryPhoneForDisplay", () => {
  it("formats the resolved primary phone", () => {
    expect(
      formatPrimaryPhoneForDisplay({ whatsapp: "+5547988334464" }),
    ).toBe("+55 (47) 98833-4464");
  });
});

function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}
