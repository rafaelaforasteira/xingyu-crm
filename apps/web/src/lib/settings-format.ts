import { isToday, isYesterday, parseISO } from "date-fns";
import type { SettingsCopy } from "./settings-i18n";

export function formatLastAccess(
  value: string | Date | null | undefined,
  copy: SettingsCopy,
  locale: string,
) {
  if (!value) return copy.neverLoggedIn;
  const date = typeof value === "string" ? parseISO(value) : value;
  const time = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  if (isToday(date)) return `${copy.today}, ${time}`;
  if (isYesterday(date)) return `${copy.yesterday}, ${time}`;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function roleLabel(role: string | undefined, copy: SettingsCopy) {
  if (role === "ADMIN") return copy.roleAdmin;
  if (role === "MANAGER") return copy.roleManager;
  return copy.roleConsultant;
}

const TIMEZONE_CITY: Record<string, string> = {
  "America/Sao_Paulo": "São Paulo",
  "America/Manaus": "Manaus",
  UTC: "UTC",
  "Asia/Shanghai": "Shanghai",
  "Asia/Hong_Kong": "Hong Kong",
};

export function formatTimezoneOffset(iana: string, at = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: iana,
      timeZoneName: "shortOffset",
    }).formatToParts(at);
    const raw = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    if (raw === "GMT" || raw === "UTC") return "UTC±00:00";
    const match = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
    if (!match) return raw.replace("GMT", "UTC");
    const sign = match[1];
    const hours = String(match[2]).padStart(2, "0");
    const minutes = match[3] ?? "00";
    return `UTC${sign}${hours}:${minutes}`;
  } catch {
    return "UTC";
  }
}

export function formatTimezoneLabel(iana: string, at = new Date()): string {
  const city = TIMEZONE_CITY[iana] ?? iana.split("/").pop()?.replace(/_/g, " ") ?? iana;
  return `${city} · ${formatTimezoneOffset(iana, at)}`;
}

export function formatTimezoneOption(iana: string, at = new Date()): string {
  const city = TIMEZONE_CITY[iana] ?? iana.split("/").pop()?.replace(/_/g, " ") ?? iana;
  return `${city} (${formatTimezoneOffset(iana, at)})`;
}

export function localeLabel(locale: string | undefined, copy: SettingsCopy): string {
  if (locale === "en") return copy.localeEn;
  if (locale === "zh-CN") return copy.localeZhCn;
  if (locale === "zh-HK") return copy.localeZhHk;
  return copy.localePt;
}

/** Days remaining until soft-archive; null when countdown cannot be computed. */
export function daysUntilArchive(
  deactivatedAt: string | Date | null | undefined,
  archiveAfterDays = 90,
  now = new Date(),
): number | null {
  if (!deactivatedAt) return null;
  const start = typeof deactivatedAt === "string" ? parseISO(deactivatedAt) : deactivatedAt;
  if (Number.isNaN(start.getTime())) return null;
  const ends = new Date(start.getTime() + archiveAfterDays * 24 * 60 * 60 * 1000);
  const ms = ends.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function daysUntilInviteExpiry(
  expiresAt: string | Date | null | undefined,
  now = new Date(),
): number | null {
  if (!expiresAt) return null;
  const end = typeof expiresAt === "string" ? parseISO(expiresAt) : expiresAt;
  if (Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
