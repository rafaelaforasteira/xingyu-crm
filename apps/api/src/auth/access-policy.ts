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
