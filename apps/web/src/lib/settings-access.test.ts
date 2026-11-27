import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/lib/auth-types";
import { visibleSettingsBlocks } from "@/lib/settings-access";
import { interpolate, settingsText } from "@/lib/settings-i18n";
import { formatLastAccess, roleLabel } from "@/lib/settings-format";

const admin: AuthUser = {
  id: "a1",
  name: "Admin",
  email: "admin@xingyu.local",
  role: "ADMIN",
  status: "ACTIVE",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  permissions: [
    "profile.view",
    "organization.manage",
    "users.manage",
    "teams.manage",
    "permissions.view",
    "settings.view",
  ],
  scopes: { deals: "ALL", orders: "ALL" },
};

const manager: AuthUser = {
  ...admin,
  id: "m1",
  role: "MANAGER",
  permissions: ["profile.view", "profile.edit", "settings.view"],
};

const consultant: AuthUser = {
  ...admin,
  id: "c1",
  role: "CONSULTANT",
  permissions: ["profile.view", "profile.edit", "settings.view"],
};

describe("settings visibility", () => {
  it("shows profile and admin blocks for admin", () => {
    expect(visibleSettingsBlocks(admin)).toEqual([
      "profile",
      "users",
      "teams",
    ]);
  });

  it("does not expose the permissions UI block while RBAC permission remains on the user", () => {
    expect(admin.permissions).toContain("permissions.view");
    expect(visibleSettingsBlocks(admin)).not.toContain("permissions");
  });

  it("shows only profile for supervisor and consultant", () => {
    expect(visibleSettingsBlocks(manager)).toEqual(["profile"]);
    expect(visibleSettingsBlocks(consultant)).toEqual(["profile"]);
  });

  it("never exposes organization or a separate security block", () => {
    expect(visibleSettingsBlocks(admin)).not.toContain("organization");
    expect(visibleSettingsBlocks(admin)).not.toContain("security");
  });
});

describe("settings copy", () => {
  it("covers the four locales", () => {
    expect(settingsText("pt-BR").title).toBe("Configurações");
    expect(settingsText("en").title).toBe("Settings");
    expect(settingsText("zh-CN").title).toBe("设置");
    expect(settingsText("zh-HK").title).toBe("設定");
    expect(interpolate(settingsText("pt-BR").usersSummary, { total: 6 })).toBe("6 usuários");
    expect(settingsText("pt-BR").resetPasswordAction).toBe("Redefinir");
    expect(settingsText("pt-BR").passwordMasked).toBe("••••••••");
  });

  it("maps MANAGER to Supervisor in pt-BR", () => {
    expect(roleLabel("MANAGER", settingsText("pt-BR"))).toBe("Supervisor");
    expect(roleLabel("ADMIN", settingsText("pt-BR"))).toBe("Administrador");
  });
});

describe("last access formatting", () => {
  it("uses never signed in when empty", () => {
    expect(formatLastAccess(null, settingsText("pt-BR"), "pt-BR")).toBe("Nunca acessou");
  });
});
