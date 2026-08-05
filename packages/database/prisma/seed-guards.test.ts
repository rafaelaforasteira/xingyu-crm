import { describe, expect, it } from "vitest";
import {
  OPERATION_DEMO_IDS,
  assertDemoSeedAllowed,
} from "./seed-guards";

describe("assertDemoSeedAllowed", () => {
  it("allows development and undefined NODE_ENV", () => {
    expect(() => assertDemoSeedAllowed("development")).not.toThrow();
    expect(() => assertDemoSeedAllowed(undefined)).not.toThrow();
    expect(() => assertDemoSeedAllowed("test")).not.toThrow();
  });

  it("blocks production", () => {
    expect(() => assertDemoSeedAllowed("production")).toThrow(
      /não deve rodar com NODE_ENV=production/,
    );
  });
});

describe("OPERATION_DEMO_IDS", () => {
  it("uses stable ids for idempotent demo upserts", () => {
    expect(OPERATION_DEMO_IDS.dealId).toBe("deal-operacao-demo");
    expect(OPERATION_DEMO_IDS.conversationId).toBe("conv-operacao-demo");
    expect(OPERATION_DEMO_IDS.contactId).toBe("ct-29");
  });
});
