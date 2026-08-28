import { describe, expect, it } from "vitest";
import type { AuthUser } from "./auth-types";
import { canOpenPath } from "./access-policy";

function user(role: AuthUser["role"], permissions: string[] = []): AuthUser {
  return {
    id: "user-1",
    name: "Usuária",
    email: "user@xingyu.test",
    role,
    status: "ACTIVE",
    locale: "pt-BR",
    timezone: "America/Sao_Paulo",
    permissions,
    scopes: {},
  };
}

describe("integration access policy", () => {
  it("allows administrators to open the restricted integrations area", () => {
    expect(canOpenPath(user("ADMIN"), "/integrations")).toBe(true);
  });

  it("allows explicitly authorized marketing or development users", () => {
    expect(canOpenPath(user("MANAGER", ["integrations.manage"]), "/integrations")).toBe(true);
  });

  it("keeps the restricted area hidden from sellers without permission", () => {
    expect(canOpenPath(user("CONSULTANT"), "/integrations")).toBe(false);
  });

  it("protects the native automations engine", () => {
    expect(canOpenPath(user("ADMIN"), "/automations")).toBe(true);
    expect(canOpenPath(user("CONSULTANT"), "/automations")).toBe(false);
  });
});
