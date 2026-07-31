export type AuthRole = "ADMIN" | "MANAGER" | "CONSULTANT";
export type UserStatus = "ACTIVE" | "INACTIVE" | "INVITED";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  status: UserStatus;
};

export const AUTH_ROLE_LABEL: Record<AuthRole, string> = {
  ADMIN: "Administradora",
  MANAGER: "Gestora",
  CONSULTANT: "Consultora",
};
