import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  role: "ADMIN",
  logout: vi.fn(async () => {}),
  onLogout: undefined as undefined | (() => Promise<void>),
}));
vi.mock("@/components/auth/auth-provider", () => ({
  useAuth: () => ({
    user: { name: "Usuária", role: session.role, avatarUrl: "/photo.jpg" },
    logout: session.logout,
  }),
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant: _variant,
    size: _size,
    ...props
  }: React.ComponentProps<"button"> & { variant?: string; size?: string }) => {
    session.onLogout = onClick as unknown as () => Promise<void>;
    return <button {...props}>{children}</button>;
  },
}));

import { HeaderAccountActions } from "./header-account-actions";

describe("topbar account actions", () => {
  beforeAll(() => vi.stubGlobal("React", React));
  afterAll(() => vi.unstubAllGlobals());

  for (const role of ["ADMIN", "MANAGER", "CONSULTANT"]) {
    it("keeps profile and logout accessible for " + role, () => {
      session.role = role;
      const html = renderToStaticMarkup(<HeaderAccountActions />);
      expect(html).toContain('href="/settings/general"');
      expect(html).toContain('aria-label="Meu perfil"');
      expect(html).toContain('aria-label="Sair"');
      expect(html).toContain('src="/photo.jpg"');
      expect(html).not.toContain("disabled");
      expect(html).not.toContain("aria-haspopup");
      expect(html).toContain('role="tooltip"');
    });
    it("uses the official logout routine for " + role, async () => {
      session.role = role;
      session.logout.mockClear();
      renderToStaticMarkup(<HeaderAccountActions />);
      await session.onLogout!();
      expect(session.logout).toHaveBeenCalledOnce();
    });
  }
});
