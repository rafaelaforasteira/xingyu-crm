import type { RecoveryOverviewData, RecoveryOpportunitiesData, RecoveryQuery } from "@xingyu/types";
import { api } from "@/lib/api";
import type { TrackingDateRange } from "../sales-tracking-types";
import { resolveTrackingDateRange } from "../tracking-dates";
export type RecoveryFilters = {
  period: TrackingDateRange;
  status: "ALL" | NonNullable<RecoveryQuery["status"]>;
  method: "ALL" | NonNullable<RecoveryQuery["method"]>;
  customerType: "ALL" | NonNullable<RecoveryQuery["customerType"]>;
  valueBand: string;
  channel: "ALL" | NonNullable<RecoveryQuery["channel"]>;
};
export const DEFAULT_RECOVERY_FILTERS: RecoveryFilters = {
  period: { mode: "preset", preset: "30d" },
  status: "ALL",
  method: "ALL",
  customerType: "ALL",
  valueBand: "ALL",
  channel: "ALL",
};
export const METHOD_LABELS = {
  AUTOMATIC: "Automática",
  CONSULTANT: "Consultora",
  MIXED: "Mista",
  UNKNOWN: "Não identificada",
};
export function recoveryRange(period: TrackingDateRange, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (key: string) => parts.find((p) => p.type === key)?.value;
  const date = `${part("year")}-${part("month")}-${part("day")}`;
  return resolveTrackingDateRange(period, new Date(date + "T12:00:00"));
}
export function recoveryQuery(filters: RecoveryFilters): RecoveryQuery {
  const range = recoveryRange(filters.period);
  return {
    ...range,
    ...(filters.status !== "ALL" ? { status: filters.status } : {}),
    ...(filters.method !== "ALL" ? { method: filters.method } : {}),
    ...(filters.customerType !== "ALL" ? { customerType: filters.customerType } : {}),
    ...(filters.channel !== "ALL" ? { channel: filters.channel } : {}),
    ...(filters.valueBand !== "ALL" ? { valueBand: filters.valueBand } : {}),
    currency: "BRL",
  };
}
export const getRecoveryOverview = (filters: RecoveryFilters) =>
  api.get<RecoveryOverviewData>("/tracking/recovery/overview", { ...recoveryQuery(filters) });
export const getRecoveryOpportunities = (
  filters: RecoveryFilters,
  options: { page: number; sort: NonNullable<RecoveryQuery["sort"]>; search: string },
) =>
  api.get<RecoveryOpportunitiesData>("/tracking/recovery/opportunities", {
    ...recoveryQuery(filters),
    ...options,
    pageSize: 10,
  });
