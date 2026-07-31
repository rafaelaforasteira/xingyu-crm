import type { AuthRole, UserStatus } from "@xingyu/database";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  status: UserStatus;
  organizationId: string;
  teamId: string | null;
  sessionId: string;
};

export type AccessTokenPayload = {
  sub: string;
  role: AuthRole;
  sessionId: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  status: UserStatus;
};
