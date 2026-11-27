import { describe, expect, it } from "vitest";
import { formatPhoneForDisplay } from "@/lib/format-phone-display";
import {
  countryCodeToFlag,
  displayOrderNumber,
  getOperationalStageProgress,
  inferCountryCode,
  localizedCountryName,
  resolveCountryCode,
} from "@/lib/order-identification-utils";

describe("order identification utilities", () => {
  it("formats a raw Brazilian international mobile without changing its digits", () => {
    expect(formatPhoneForDisplay("+5519988778807")).toBe("+55 (19) 98877-8807");
  });

  it("does not double-format an already formatted Brazilian phone", () => {
    expect(formatPhoneForDisplay("+55 (19) 98877-8807")).toBe("+55 (19) 98877-8807");
  });

  it("keeps ambiguous international numbers conservative", () => {
    expect(formatPhoneForDisplay("+8613812345678")).toBe("+8613812345678");
  });

  it.each([
    ["BR", "🇧🇷"],
    ["CN", "🇨🇳"],
    ["US", "🇺🇸"],
    [undefined, ""],
    ["invalid", ""],
  ])("converts country code %s to the expected flag", (code, flag) => {
    expect(countryCodeToFlag(code)).toBe(flag);
  });

  it("infers known countries and prefers a valid explicit code", () => {
    expect(inferCountryCode("Brasil")).toBe("BR");
    expect(resolveCountryCode("Brasil", "cn")).toBe("CN");
    expect(resolveCountryCode("Brasil", undefined)).toBe("BR");
  });

  it("falls back to the stored country when no code exists", () => {
    expect(localizedCountryName("País de demonstração", undefined, "pt-BR")).toBe(
      "País de demonstração",
    );
  });

  it("normalizes the official order number", () => {
    expect(displayOrderNumber(undefined, "123")).toBe("#123");
    expect(displayOrderNumber("#ABC", "123")).toBe("#ABC");
  });

  it("advances only through active, non-archived stages ordered by position", () => {
    const stage = (id: string, position: number, extra = {}) => ({
      id,
      code: id,
      name: id,
      color: "#000000",
      position,
      category: "IN_PROGRESS" as const,
      isInitial: false,
      isFinal: false,
      active: true,
      archived: false,
      ...extra,
    });
    const stages = [
      stage("last", 4, { isFinal: true }),
      stage("archived", 2, { archived: true }),
      stage("inactive", 3, { active: false }),
      stage("first", 1),
    ];
    expect(getOperationalStageProgress(stages, "first").nextStage?.id).toBe("last");
    expect(getOperationalStageProgress(stages, "last").complete).toBe(true);
    expect(getOperationalStageProgress(stages, "missing").nextStage).toBeUndefined();
  });
});
