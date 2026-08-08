import { allocateLeadSequence, formatLeadCode } from "./lead-sequence";

describe("formatLeadCode", () => {
  it("pads to at least four digits", () => {
    expect(formatLeadCode(1)).toBe("Lead #0001");
    expect(formatLeadCode(9)).toBe("Lead #0009");
    expect(formatLeadCode(48)).toBe("Lead #0048");
    expect(formatLeadCode(9999)).toBe("Lead #9999");
    expect(formatLeadCode(10000)).toBe("Lead #10000");
  });

  it("returns null for invalid values", () => {
    expect(formatLeadCode(null)).toBeNull();
    expect(formatLeadCode(undefined)).toBeNull();
    expect(formatLeadCode(0)).toBeNull();
    expect(formatLeadCode(-1)).toBeNull();
    expect(formatLeadCode(Number.NaN)).toBeNull();
  });
});

describe("allocateLeadSequence", () => {
  it("returns the sequence from an atomic UPDATE", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ seq: 48 }]),
    };
    await expect(allocateLeadSequence(tx, "org-1")).resolves.toBe(48);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid allocation results", async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    await expect(allocateLeadSequence(tx, "org-1")).rejects.toThrow(
      /Failed to allocate leadSequence/,
    );
  });
});
