export const DEMO_ORG_ID = "org-xingyu";
export const DEMO_USER_ID = "demo-admin";
export const DEMO_USER_NAME = "Raffaela";
export const DEMO_TEAM_ID = "team-gestao";

export const APP_NAME = "Xingyu CRM";
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
