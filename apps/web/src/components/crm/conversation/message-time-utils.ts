import { MESSAGE_TIME_ZONE } from "./message-content-utils";

const TIME_CACHE = new Map<string, Intl.DateTimeFormat>();
const DATE_CACHE = new Map<string, Intl.DateTimeFormat>();
const FULL_CACHE = new Map<string, Intl.DateTimeFormat>();

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function timeFormatter(timeZone: string) {
  let formatter = TIME_CACHE.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    TIME_CACHE.set(timeZone, formatter);
  }
  return formatter;
}

function dateFormatter(timeZone: string) {
  let formatter = DATE_CACHE.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    DATE_CACHE.set(timeZone, formatter);
  }
  return formatter;
}

function fullFormatter(timeZone: string) {
  let formatter = FULL_CACHE.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    FULL_CACHE.set(timeZone, formatter);
  }
  return formatter;
}

export function formatMessageClock(
  value: string | Date | null | undefined,
  timeZone = MESSAGE_TIME_ZONE,
): string {
  const date = toDate(value);
  if (!date) return "";
  return timeFormatter(timeZone).format(date);
}

export function formatMessageFullDateTime(
  value: string | Date | null | undefined,
  timeZone = MESSAGE_TIME_ZONE,
): string {
  const date = toDate(value);
  if (!date) return "";
  const parts = fullFormatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const day = get("day");
  const month = get("month");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  if (!day || !month || !year || !hour || !minute) {
    return dateFormatter(timeZone).format(date);
  }
  return `${day}/${month}/${year} às ${hour}:${minute}`;
}

export function formatMessageDateOnly(
  value: string | Date | null | undefined,
  timeZone = MESSAGE_TIME_ZONE,
): string {
  const date = toDate(value);
  if (!date) return "";
  return dateFormatter(timeZone).format(date);
}
