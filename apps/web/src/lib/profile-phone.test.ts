import { describe, expect, it } from "vitest";
import {
  composePhoneE164,
  detectPhoneDialCode,
  isValidProfilePhone,
  nationalPhoneDigits,
} from "./profile-phone";

describe("profile-phone", () => {
  it("detects dial codes for BR US CN", () => {
    expect(detectPhoneDialCode("+5532998830969")).toBe("55");
    expect(detectPhoneDialCode("+13055550198")).toBe("1");
    expect(detectPhoneDialCode("+8613812345678")).toBe("86");
  });

  it("extracts national digits", () => {
    expect(nationalPhoneDigits("+5532998830969", "55")).toBe("32998830969");
    expect(nationalPhoneDigits("+13055550198", "1")).toBe("3055550198");
  });

  it("composes and validates", () => {
    expect(composePhoneE164("55", "32998830969")).toBe("+5532998830969");
    expect(isValidProfilePhone("55", "32998830969")).toBe(true);
    expect(isValidProfilePhone("1", "3055550198")).toBe(true);
    expect(isValidProfilePhone("55", "123")).toBe(false);
  });
});
