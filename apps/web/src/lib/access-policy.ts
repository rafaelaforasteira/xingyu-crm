import type { AuthUser } from "./auth-types";
export function can(user: AuthUser | null, permission: string) { return Boolean(user?.permissions?.includes(permission)); }
export function canOpenPath(user: AuthUser | null, href: string) {
  if (!user) return false;
  if (href.startsWith("/settings")) return can(user, "settings.view");
  if (href.startsWith("/dashboard")) return can(user, "dashboard.view");
  if (href.startsWith("/clients")) return can(user, "clients.view");
  if (href.startsWith("/finance")) return can(user, "finance.view");
  if (href.startsWith("/automations")) return can(user, "automations.manage") || can(user, "automations.view") || user.role === "ADMIN";
  if (href.startsWith("/integrations")) return can(user, "integrations.manage") || user.role === "ADMIN";
  if (href.startsWith("/connections")) return can(user, "integrations.manage") || user.role === "ADMIN";
  if (href.startsWith("/pipelines")) return can(user, "pipelines.view");
  if (href.startsWith("/orders")) return can(user, "orders.view");
  return user.role === "ADMIN";
}
