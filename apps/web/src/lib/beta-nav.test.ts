import { describe, expect, it } from "vitest";
import { BETA_SINGLE_PIPELINE_NAV_GROUPS, NAV_GROUPS } from "./nav";

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

  it("uses the sidebar grouped by product area", () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual([
      "Visão geral",
      "Relacionamento",
      "Jornadas",
      "Gestão",
    ]);
    expect(NAV_GROUPS.flatMap((group) => group.items).map((item) => item.href)).toEqual([
      "/dashboard",
      "/tasks",
      "/clients",
      "/pipelines",
      "/orders",
      "/finance",
      "/connections",
    ]);
    expect(NAV_GROUPS.flatMap((group) => group.items)).toContainEqual(
      expect.objectContaining({ href: "/orders", label: "Pedidos" }),
    );
    expect(NAV_GROUPS.flatMap((group) => group.items)).toContainEqual(
      expect.objectContaining({ href: "/finance", label: "Financeiro" }),
    );
    expect(NAV_GROUPS.flatMap((group) => group.items)).toContainEqual(
      expect.objectContaining({ href: "/connections", label: "Conexões" }),
    );
  });
});
