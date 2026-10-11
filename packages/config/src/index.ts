export const DEMO_ORG_ID = "org-xingyu";
export const DEMO_USER_ID = "demo-admin";
export const DEMO_USER_NAME = "Raffaela";
export const DEMO_TEAM_ID = "team-gestao";

export const APP_NAME = "BRAINX";
export const APP_VERSION = "0.1.0";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const MAX_UPLOAD_MB = 10;

export const CURRENCY = "BRL";
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const ORDER_STATUSES = [
  "ORDER_PLACED",
  "AWAITING_PAYMENT",
  "PAYMENT_APPROVED",
  "SEPARATING",
  "IN_PRODUCTION",
  "LEFT_FACTORY",
  "INTERNATIONAL_TRANSPORT",
  "ARRIVED_BRAZIL",
  "NATIONAL_TRANSPORT",
  "DELIVERED",
  "AFTER_SALES_STARTED",
  "COMPLETED",
] as const;

export const TASK_TYPES = [
  "CALL",
  "WHATSAPP",
  "FOLLOW_UP",
  "COLLECTION",
  "SEND_CATALOG",
  "SEND_LINK",
  "PAYMENT",
  "MEETING",
  "MONITORING",
  "AFTER_SALES",
  "REPURCHASE",
  "INTERNAL",
] as const;

/** Product access policy; roles come from the authenticated session. */
export const TRACKING_OVERVIEW_PATH = "/tracking/vendas";
export function isCrmAdministrator(role: string | null | undefined): boolean {
  return role === "ADMIN";
}
export function canAccessCrmRoute(role: string | null | undefined, href: string): boolean {
  if (!role) return false;
  if (isCrmAdministrator(role)) return true;
  const path = href.split(/[?#]/)[0]?.replace(/\/+$/, "") || "/";
  return path === TRACKING_OVERVIEW_PATH || path === "/settings/general";
}
export function canAccessCrmApi(
  role: string | null | undefined,
  method: string,
  path: string,
): boolean {
  if (isCrmAdministrator(role)) return true;
  if (!role) return false;
  const route = path
    .split("?")[0]
    ?.replace(/^\/api(?=\/|$)/, "")
    .replace(/\/+$/, "");
  return (
    (method === "GET" && route === "/auth/me") ||
    (method === "POST" && route === "/auth/change-password") ||
    (["GET", "PATCH"].includes(method) && route === "/settings/profile") ||
    (method === "POST" && route === "/settings/profile/avatar")
  );
}
