import { describe, it, expect } from "vitest";
import { canAccessCrmRoute, canAccessCrmApi } from "@xingyu/config";
import { canOpenPath } from "./access-policy";
import type { AuthUser } from "./auth-types";
describe("restricted CRM access", () => {
  for (const role of ["MANAGER", "CONSULTANT"] as const) {
    it(role + " allows Tracking and the existing personal profile screen", () => {
      expect(canAccessCrmRoute(role, "/tracking/vendas?period=90d")).toBe(true);
      expect(canAccessCrmRoute(role, "/settings/general")).toBe(true);
      expect(canAccessCrmRoute(role, "/settings/users")).toBe(false);
      expect(canAccessCrmRoute(role, "/settings/general/extra")).toBe(false);
      for (const path of [
        "/dashboard",
        "/tasks",
        "/pipelines/p1",
        "/orders",
        "/settings",
        "/tracking/other",
        "/tracking/recuperacao",
        "/tracking/vendas/extra",
        "/finance",
        "/connections",
      ]) {
        expect(canAccessCrmRoute(role, path)).toBe(false);
      }
    });
    it(role + " denies direct business APIs including search and writes", () => {
      for (const path of [
        "/api/orders",
        "/api/search",
        "/api/pipelines",
        "/api/dashboard/metrics",
        "/api/settings",
        "/api/tracking/recovery/overview",
        "/api/tracking/recovery/opportunities",
      ]) {
        for (const method of ["GET", "POST", "DELETE"])
          expect(canAccessCrmApi(role, method, path)).toBe(false);
      }
      expect(canAccessCrmApi(role, "GET", "/api/auth/me")).toBe(true);
      expect(canAccessCrmApi(role, "POST", "/api/auth/change-password")).toBe(true);
      expect(canAccessCrmApi(role, "GET", "/api/settings/profile")).toBe(true);
      expect(canAccessCrmApi(role, "PATCH", "/api/settings/profile")).toBe(true);
      expect(canAccessCrmApi(role, "POST", "/api/settings/profile/avatar")).toBe(true);
      expect(canAccessCrmApi(role, "DELETE", "/api/settings/profile")).toBe(false);
      expect(canAccessCrmApi(role, "GET", "/api/settings/users")).toBe(false);
    });
  }
  it("keeps admins unrestricted and denies unresolved sessions", () => {
    expect(canAccessCrmRoute("ADMIN", "/orders/o1")).toBe(true);
    expect(canAccessCrmApi("ADMIN", "POST", "/api/orders")).toBe(true);
    expect(canOpenPath(null, "/tracking/vendas")).toBe(false);
    expect(
      canOpenPath({ role: "CONSULTANT", permissions: ["orders.view"] } as AuthUser, "/orders"),
    ).toBe(false);
  });
});
