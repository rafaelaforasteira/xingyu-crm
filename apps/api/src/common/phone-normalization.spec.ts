import { BadRequestException } from "@nestjs/common";
import { normalizeRealPhone, normalizePhone } from "./phone-normalization";

describe("normalizeRealPhone", () => {
  it.each([
    ["+55 47 98833-4464", "5547988334464"],
    ["(47) 98833-4464", "5547988334464"],
    ["+55 11 3456-7890", "551134567890"],
    ["+351 912 345 678", "351912345678"],
  ])("accepts the real number %s", (input, expected) => {
    expect(normalizeRealPhone(input)).toBe(expected);
  });

  it.each([
    ["12345678901"],
    ["(00) 91234-5678"],
    ["+55 99 99999-9999999"],
    ["1234"],
  ])("rejects the made-up number %s", (input) => {
    expect(() => normalizeRealPhone(input)).toThrow(BadRequestException);
  });
});

describe("normalizePhone", () => {
  it.each([
    ["+55 47 98833-4464", "5547988334464"],
    ["5547988334464", "5547988334464"],
    ["(47) 98833-4464", "5547988334464"],
    ["47 8833-4464", "554788334464"],
  ])("normalizes %s without inventing the ninth digit", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});
