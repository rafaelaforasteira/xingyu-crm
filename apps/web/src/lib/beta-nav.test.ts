import { describe, expect, it } from "vitest";
import { BETA_SINGLE_PIPELINE_NAV_GROUPS, NAV_GROUPS } from "./nav";
import { BETA_SINGLE_PIPELINE_MODE } from "./beta-config";

describe("beta navigation", () => {
  it("exposes the expandable Pipelines module", () => {
    const items = BETA_SINGLE_PIPELINE_NAV_GROUPS.flatMap((group) => group.items);
    expect(items).toHaveLength(2);
    expect(items[0]?.href).toBe("/pipelines");
    expect(items[0]?.label).toBe("Pipelines");
    expect(items[0]?.expandablePipelines).toBe(true);
    expect(items[1]).toMatchObject({ href: "/tasks", label: "Tarefas" });
    expect(items.some((item) => item.href === "/settings")).toBe(false);
    expect(items.some((item) => item.href === "/dashboard")).toBe(false);
  });

  it("uses beta nav when beta mode is enabled", () => {
    if (!BETA_SINGLE_PIPELINE_MODE) return;
    const hrefs = NAV_GROUPS.flatMap((group) => group.items).map((item) => item.href);
    expect(hrefs).toEqual(["/pipelines", "/tasks"]);
  });
});
