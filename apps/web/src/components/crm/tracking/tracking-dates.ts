import { addDays, addMonths, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import type { TrackingDateRange } from "./sales-tracking-types";
import type { ResolvedTrackingRange } from "./tracking-analytics-types";
export function resolveTrackingDateRange(
  period: TrackingDateRange,
  today = new Date(),
): ResolvedTrackingRange {
  const endDate = format(today, "yyyy-MM-dd");
  if (period.mode === "custom") {
    const valid = (value: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      isValid(parseISO(value)) &&
      format(parseISO(value), "yyyy-MM-dd") === value;
    if (
      !valid(period.startDate) ||
      !valid(period.endDate) ||
      period.startDate > period.endDate ||
      period.endDate > endDate
    )
      throw new Error("Selecione um intervalo válido, sem datas futuras.");
    return { startDate: period.startDate, endDate: period.endDate };
  }
  const end = parseISO(endDate);
  const start =
    period.preset === "12m"
      ? addDays(addMonths(end, -12), 1)
      : addDays(end, period.preset === "90d" ? -89 : -29);
  return { startDate: format(start, "yyyy-MM-dd"), endDate };
}
export function timelineGranularity(range: ResolvedTrackingRange): "day" | "week" | "month" {
  const days = differenceInCalendarDays(parseISO(range.endDate), parseISO(range.startDate)) + 1;
  return days <= 31 ? "day" : days <= 180 ? "week" : "month";
}
