export type AuthRole = "ADMIN" | "MANAGER" | "CONSULTANT";
export type UserStatus = "ACTIVE" | "INACTIVE" | "INVITED";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  status: UserStatus;
  phone?: string | null;
  avatarUrl?: string | null;
  title?: string | null;
  locale: "pt-BR" | "en" | "zh-CN" | "zh-HK";
  timezone: string;
  permissions: string[];
  scopes: Partial<Record<"deals" | "orders", "SELF" | "TEAM" | "ALL">>;
};

export const AUTH_ROLE_LABEL: Record<AuthRole, string> = {
  ADMIN: "Administradora",
  MANAGER: "Supervisor",
  CONSULTANT: "Consultora",
};
