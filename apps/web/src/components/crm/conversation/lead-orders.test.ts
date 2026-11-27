import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("lead order history contract", () => {
  const source = readFileSync(new URL("./lead-orders.tsx", import.meta.url), "utf8");
  const panel = readFileSync(new URL("./lead-context-panel.tsx", import.meta.url), "utf8");

  it("keeps compact and full history inside the lead context", () => {
    expect(source).toContain("slice(0, 3)");
    expect(source).toContain("Ver histórico de pedidos");
    expect(source).toContain("Histórico de pedidos ·");
    expect(source).toContain("lead-order-detail");
    expect(source).not.toContain('href="/orders"');
  });

  it("uses order snapshots instead of current contact fields", () => {
    expect(source).toContain("customerNameSnapshot");
    expect(source).toContain("customerPhoneSnapshot");
    expect(source).toContain("formattedAddressSnapshot");
    expect(source).toContain("trackingSourceSnapshot");
    expect(panel).not.toContain("Abrir pedidos");
    expect(panel).not.toContain("Último:");
  });

  it("includes finite reduced-motion-safe KPI animation", () => {
    expect(source).toContain("220ms ease-out both");
    expect(source).toContain("prefers-reduced-motion: reduce");
    expect(source).not.toContain("infinite");
  });
});
