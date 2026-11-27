import type { AuthUser } from "./auth-types";
import { canAccessCrmRoute, isCrmAdministrator } from "@xingyu/config";
export function can(user: AuthUser | null, permission: string) {
  return Boolean(
    user &&
    (isCrmAdministrator(user.role)
      ? user.permissions.includes(permission)
      : ["tracking.overview", "profile.view", "profile.edit"].includes(permission)),
  );
}
export function canOpenPath(user: AuthUser | null, href: string) {
  return canAccessCrmRoute(user?.role, href);
}
