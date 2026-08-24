import { AuthRole, ChannelAccessMode } from "@xingyu/database";
import type { AuthenticatedUser } from "../auth/types";

export type AccessibleConnection = {
  organizationId: string;
  accessMode: ChannelAccessMode;
  ownerUserId: string | null;
  teamAccesses?: Array<{ teamId: string }>;
  userAccesses?: Array<{ userId: string }>;
};

export function canUserAccessConnection(
  user: AuthenticatedUser,
  channel: AccessibleConnection,
): boolean {
  if (user.organizationId !== channel.organizationId) return false;
  if (user.role === AuthRole.ADMIN || channel.accessMode === ChannelAccessMode.ORGANIZATION) {
    return true;
  }
  if (channel.ownerUserId === user.id) return true;
  if (channel.userAccesses?.some((access) => access.userId === user.id)) return true;
  return Boolean(
    user.teamId && channel.teamAccesses?.some((access) => access.teamId === user.teamId),
  );
}
