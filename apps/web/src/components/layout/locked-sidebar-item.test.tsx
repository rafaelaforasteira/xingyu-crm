import * as React from "react";
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShoppingCart } from "lucide-react";
import { LockedSidebarItem } from "./locked-sidebar-item";
describe("locked sidebar rows", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());
  for (const collapsed of [false, true])
    it("is static and accessible when collapsed=" + collapsed, () => {
      const html = renderToStaticMarkup(
        <LockedSidebarItem label="Pedidos" icon={ShoppingCart} collapsed={collapsed} />,
      );
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain("disponível apenas para administradores");
      expect(html).toContain("cursor-default");
      expect(html).not.toMatch(/<a[ >]|<button[ >]|tabindex=|aria-current=/i);
      expect(html).toContain('data-nav-locked="true"');
    });
});
