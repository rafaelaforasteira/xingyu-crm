import { describe, expect, it } from "vitest";
import { findArea, firstUnlockedPath, isPathUnlocked, lockedAreaLabel } from "./area-locks";

describe("area locks", () => {
  it("keeps every pipeline route open in the current stage", () => {
    for (const path of [
      "/pipelines",
      "/pipelines/",
      "/pipelines/pipe-comercial",
      "/pipelines/pipe-comercial?view=kanban&deal=deal-09",
      "/pipelines/pipe-comercial/deals/deal-09",
      "/pipelines/pipe-comercial/settings/stages",
      "/pipelines/access",
      "/operacao",
    ]) {
      expect(isPathUnlocked(path), path).toBe(true);
    }
  });

  it("locks the other areas, including their sub-routes", () => {
    for (const path of [
      "/dashboard",
      "/inbox/conv-1",
      "/tasks",
      "/orders?pipeline=ecommerce",
      "/orders/ord-1",
      "/after-sales?pipeline=refunds",
      "/tracking/vendas",
      "/settings",
      "/settings/pipelines",
      "/automations/new",
    ]) {
      expect(isPathUnlocked(path), path).toBe(false);
    }
  });

  it("does not confuse prefixes that only share the beginning", () => {
    expect(findArea("/pipelinesx")).toBeNull();
    expect(isPathUnlocked("/pipelinesx")).toBe(false);
  });

  it("locks unknown routes by default", () => {
    expect(isPathUnlocked("/nova-area")).toBe(false);
  });

  it("unlocks an area when it is added to the list", () => {
    expect(isPathUnlocked("/tasks", ["pipelines", "tasks"])).toBe(true);
    expect(isPathUnlocked("/dashboard", ["pipelines", "tasks"])).toBe(false);
  });

  it("names the locked area and points back to the first open one", () => {
    expect(lockedAreaLabel("/finance")).toBe("Financeiro");
    expect(lockedAreaLabel("/nada")).toBeNull();
    expect(firstUnlockedPath()).toBe("/pipelines");
  });
});
