import { DEFAULT_TIMEZONE } from "@xingyu/config";

const WEEKDAY_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const TIME_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
const DATE_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function getWeekdayFormatter(timeZone: string) {
  let formatter = WEEKDAY_FORMATTER_CACHE.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      weekday: "long",
    });
    WEEKDAY_FORMATTER_CACHE.set(timeZone, formatter);
  }
  return formatter;
}

function getTimeFormatter(timeZone: string) {
  let formatter = TIME_FORMATTER_CACHE.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    TIME_FORMATTER_CACHE.set(timeZone, formatter);
  }
  return formatter;
}

function getDateFormatter(timeZone: string) {
  let formatter = DATE_FORMATTER_CACHE.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    DATE_FORMATTER_CACHE.set(timeZone, formatter);
  }
  return formatter;
}

function toValidDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/** Calendar yyyy-mm-dd key in the given timezone. */
export function calendarDayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addCalendarDays(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const utc = new Date(Date.UTC(year!, month! - 1, day! + days));
  return utc.toISOString().slice(0, 10);
}

function dayDiff(fromKey: string, toKey: string): number {
  const from = Date.parse(`${fromKey}T00:00:00Z`);
  const to = Date.parse(`${toKey}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

/**
 * WhatsApp-style conversation list timestamps in the organization timezone.
 * - same day: 14:32
 * - yesterday: Ontem
 * - 2–6 days ago: weekday
 * - 7+ days: dd/MM/yyyy
 */
export function formatConversationTimestamp(
  value: string | Date | null | undefined,
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string {
  const date = toValidDate(value);
  if (!date) return "";

  const zone = timeZone || DEFAULT_TIMEZONE;
  const messageDay = calendarDayKey(date, zone);
  const today = calendarDayKey(now, zone);
  const yesterday = addCalendarDays(today, -1);
  const diff = dayDiff(messageDay, today);

  if (messageDay === today) {
    return getTimeFormatter(zone).format(date);
  }
  if (messageDay === yesterday) {
    return "Ontem";
  }
  if (diff >= 2 && diff <= 6) {
    return getWeekdayFormatter(zone).format(date);
  }
  return getDateFormatter(zone).format(date);
}
