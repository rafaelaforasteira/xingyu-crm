import { describe, expect, it } from "vitest";
import { BETA_SINGLE_PIPELINE_NAV_GROUPS, NAV_GROUPS } from "./nav";
import { BETA_SINGLE_PIPELINE_MODE } from "./beta-config";

describe("beta navigation", () => {
  it("exposes the expandable Pipelines module", () => {
    const items = BETA_SINGLE_PIPELINE_NAV_GROUPS.flatMap((group) => group.items);
    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({ href: "/dashboard", label: "Dashboard" });
    expect(items[1]).toMatchObject({ href: "/tasks", label: "Tarefas" });
    expect(items[2]?.href).toBe("/pipelines");
    expect(items[2]?.label).toBe("Pipelines");
    expect(items[2]?.expandablePipelines).toBe(true);
    expect(items[3]).toMatchObject({ href: "/orders", label: "Pedidos" });
    expect(items.some((item) => item.href === "/settings")).toBe(false);
    expect(items.some((item) => item.href === "/dashboard")).toBe(true);
  });

  it("uses beta nav when beta mode is enabled", () => {
    if (!BETA_SINGLE_PIPELINE_MODE) return;
    const hrefs = NAV_GROUPS.flatMap((group) => group.items).map((item) => item.href);
    expect(hrefs).toEqual(["/dashboard", "/tasks", "/pipelines", "/orders"]);
  });
});
