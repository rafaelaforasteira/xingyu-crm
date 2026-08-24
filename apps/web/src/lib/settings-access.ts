import type { AuthUser } from "./auth-types";
import { can } from "./access-policy";

export type SettingsBlock = "profile" | "users" | "teams" | "permissions";

export function visibleSettingsBlocks(user: AuthUser | null): SettingsBlock[] {
  if (!user) return ["profile"];
  const blocks: SettingsBlock[] = ["profile"];
  if (can(user, "users.manage")) blocks.push("users");
  if (can(user, "teams.manage")) blocks.push("teams");
  // Permissions matrix UI is temporarily hidden; RBAC/guards remain intact.
  return blocks;
}
