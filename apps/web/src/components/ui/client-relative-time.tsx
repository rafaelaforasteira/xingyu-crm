"use client";

import * as React from "react";
import { formatDistance } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DEFAULT_TIMEZONE } from "@xingyu/config";
import { safeDate } from "@/lib/normalizers";

const DEFAULT_REFRESH_INTERVAL_MS = 60_000;

const absoluteDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: DEFAULT_TIMEZONE,
});

export interface ClientRelativeTimeProps {
  value?: string | number | Date | null;
  /**
   * Stable text rendered by the server and by the first client render.
   * Defaults to the absolute date in the CRM timezone.
   */
  fallback?: React.ReactNode;
  invalidFallback?: React.ReactNode;
  className?: string;
  refreshIntervalMs?: number;
}

export function formatAbsoluteDateTime(value: unknown): string | null {
  const date = safeDate(value, "absolute date");
  return date ? absoluteDateTimeFormatter.format(date) : null;
}

export function formatRelativeDateTime(
  value: unknown,
  relativeTo: unknown,
): string | null {
  const date = safeDate(value, "relative date");
  const now = safeDate(relativeTo, "relative date reference");
  if (!date || !now) return null;
  return formatDistance(date, now, { addSuffix: true, locale: ptBR });
}

/**
 * Renders deterministic absolute/fallback text during SSR and hydration.
 * Relative text is calculated only after the component mounts in the browser.
 */
export function ClientRelativeTime({
  value,
  fallback,
  invalidFallback = "—",
  className,
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
}: ClientRelativeTimeProps) {
  const date = React.useMemo(() => safeDate(value, "relative time"), [value]);
  const [clientNow, setClientNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    if (!date) {
      setClientNow(null);
      return;
    }

    const update = () => setClientNow(new Date());
    update();

    if (
      !Number.isFinite(refreshIntervalMs) ||
      refreshIntervalMs <= 0
    ) {
      return;
    }

    const intervalId = globalThis.setInterval(
      update,
      Math.max(1_000, refreshIntervalMs),
    );
    return () => globalThis.clearInterval(intervalId);
  }, [date, refreshIntervalMs]);

  if (!date) {
    return <span className={className}>{invalidFallback}</span>;
  }

  const absolute = absoluteDateTimeFormatter.format(date);
  const relative = clientNow
    ? formatDistance(date, clientNow, { addSuffix: true, locale: ptBR })
    : null;

  return (
    <time
      className={className}
      dateTime={date.toISOString()}
      title={absolute}
      aria-label={absolute}
    >
      {relative ?? fallback ?? absolute}
    </time>
  );
}
