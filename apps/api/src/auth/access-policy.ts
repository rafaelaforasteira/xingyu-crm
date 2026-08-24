import { AuthRole } from "@xingyu/database";
export type Permission = "profile.view"|"profile.edit"|"settings.view"|"organization.manage"|"users.manage"|"teams.manage"|"permissions.view"|"dashboard.view"|"clients.view"|"pipelines.view"|"deals.edit"|"orders.view"|"orders.edit"|"finance.view"|"finance.sensitive"|"integrations.manage";
export type AccessScope = "SELF" | "TEAM" | "ALL";
const matrix: Record<AuthRole, { permissions: ReadonlySet<Permission>; scopes: Partial<Record<"deals"|"orders", AccessScope>> }> = {
  ADMIN: { permissions: new Set(["profile.view","profile.edit","settings.view","organization.manage","users.manage","teams.manage","permissions.view","dashboard.view","clients.view","pipelines.view","deals.edit","orders.view","orders.edit","finance.view","finance.sensitive","integrations.manage"]), scopes: { deals:"ALL", orders:"ALL" } },
  MANAGER: { permissions: new Set(["profile.view","profile.edit","settings.view","pipelines.view","deals.edit","orders.view","orders.edit"]), scopes: { deals:"ALL", orders:"ALL" } },
  CONSULTANT: { permissions: new Set(["profile.view","profile.edit","settings.view","pipelines.view","deals.edit","orders.view","orders.edit"]), scopes: { deals:"SELF", orders:"SELF" } },
};
export function can(role: AuthRole, permission: Permission) { return matrix[role].permissions.has(permission); }
export function getScope(role: AuthRole, resource: "deals"|"orders"): AccessScope { return matrix[role].scopes[resource] ?? "SELF"; }
export function accessManifest(role: AuthRole) { return { role, permissions: [...matrix[role].permissions], scopes: matrix[role].scopes }; }

export const ACCESS_AREAS = [
  "dashboard",
  "clients",
  "pipelines",
  "orders",
  "finance",
  "settings",
  "users",
  "teams",
  "profile",
] as const;
export type AccessArea = (typeof ACCESS_AREAS)[number];
export type AccessCell = "TOTAL" | "ALL" | "SELF" | "TEAM" | "OWN" | "MANAGE" | "PROFILE" | "NONE";

export function accessCell(role: AuthRole, area: AccessArea): AccessCell {
  switch (area) {
    case "dashboard":
      return can(role, "dashboard.view") ? "TOTAL" : "NONE";
    case "clients":
      return can(role, "clients.view") ? "TOTAL" : "NONE";
    case "pipelines":
      return can(role, "pipelines.view") ? getScope(role, "deals") : "NONE";
    case "orders":
      return can(role, "orders.view") ? getScope(role, "orders") : "NONE";
    case "finance":
      return can(role, "finance.view") ? "TOTAL" : "NONE";
    case "settings":
      if (can(role, "organization.manage")) return "TOTAL";
      return can(role, "settings.view") ? "PROFILE" : "NONE";
    case "users":
      return can(role, "users.manage") ? "MANAGE" : "NONE";
    case "teams":
      return can(role, "teams.manage") ? "MANAGE" : "NONE";
    case "profile":
      return can(role, "profile.view") ? "OWN" : "NONE";
  }
}

export function accessMatrix() {
  const roles = [AuthRole.ADMIN, AuthRole.MANAGER, AuthRole.CONSULTANT] as const;
  return ACCESS_AREAS.map((area) => ({
    area,
    cells: Object.fromEntries(roles.map((role) => [role, accessCell(role, area)])) as Record<
      (typeof roles)[number],
      AccessCell
    >,
  }));
}
