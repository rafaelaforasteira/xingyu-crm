import { describe, expect, it } from "vitest";
import { checkPhone, dialCode, formatNationalAsYouType } from "./phone-input";

describe("phone input", () => {
  it("formats Brazilian numbers as you type", () => {
    expect(formatNationalAsYouType("11912345678", "BR")).toBe("(11) 91234-5678");
    expect(formatNationalAsYouType("119", "BR")).toBe("(11) 9");
    expect(formatNationalAsYouType("", "BR")).toBe("");
  });

  it("accepts real Brazilian mobile and landline numbers", () => {
    const mobile = checkPhone("(11) 91234-5678", "BR");
    expect(mobile).toMatchObject({ valid: true, e164: "+5511912345678" });
    expect(checkPhone("(11) 3456-7890", "BR")).toMatchObject({ valid: true, e164: "+551134567890" });
  });

  it("rejects made-up numbers", () => {
    expect(checkPhone("12345678901", "BR")).toMatchObject({ valid: false, reason: "invalid" }); // DDD 12 + mobile without 9
    expect(checkPhone("(00) 91234-5678", "BR")).toMatchObject({ valid: false }); // DDD 00 does not exist
    expect(checkPhone("99999999999999", "BR")).toMatchObject({ valid: false });
  });

  it("reports incomplete and empty input", () => {
    expect(checkPhone("1191", "BR")).toMatchObject({ valid: false, reason: "incomplete" });
    expect(checkPhone("", "BR")).toMatchObject({ valid: false, reason: "empty" });
  });

  it("validates against the selected country", () => {
    expect(checkPhone("912 345 678", "PT")).toMatchObject({ valid: true, e164: "+351912345678" });
    expect(checkPhone("(11) 91234-5678", "PT")).toMatchObject({ valid: false });
    expect(dialCode("BR")).toBe("+55");
    expect(dialCode("PT")).toBe("+351");
  });
});
