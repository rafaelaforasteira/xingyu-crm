import { describe, expect, it } from "vitest";
import { MAX_CURRENCY_CENTS, centsFromInput, centsToReais, formatCents } from "./currency-input";

describe("currency input", () => {
  it("treats typed digits as cents", () => {
    expect(centsFromInput("1")).toBe(1);
    expect(centsFromInput("150000")).toBe(150000);
    expect(formatCents(150000)).toBe("R$ 1.500,00");
    expect(formatCents(1)).toBe("R$ 0,01");
  });

  it("ignores letters, symbols and leading zeros", () => {
    expect(centsFromInput("R$ 1.500,00")).toBe(150000);
    expect(centsFromInput("abc")).toBeNull();
    expect(centsFromInput("0000")).toBeNull();
    expect(centsFromInput("")).toBeNull();
  });

  it("caps unrealistic values", () => {
    expect(centsFromInput("999999999999999")).toBe(MAX_CURRENCY_CENTS);
    expect(formatCents(MAX_CURRENCY_CENTS)).toBe("R$ 99.999.999,99");
  });

  it("converts to reais for the API", () => {
    expect(centsToReais(150050)).toBe(1500.5);
    expect(centsToReais(null)).toBeUndefined();
  });
});
