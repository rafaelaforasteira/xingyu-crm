import { normalizePhone } from "./phone-normalization";

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
