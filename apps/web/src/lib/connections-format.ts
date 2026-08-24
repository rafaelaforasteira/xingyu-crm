import type { ConnectionsCopy } from "./connections-i18n";

export function connectionStatusLabel(status: string, copy: ConnectionsCopy): string {
  const labels: Record<string, string> = {
    CONNECTED: copy.statusConnected,
    ATTENTION: copy.statusAttention,
    ERROR: copy.statusAttention,
    RECONNECTING: copy.statusConnecting,
    OFFLINE: copy.statusOffline,
    DISCONNECTED: copy.statusOffline,
    QR_PENDING: copy.statusPending,
    CONNECTING: copy.statusConnecting,
    ARCHIVED: copy.statusArchived,
  };
  return labels[status] ?? status;
}

export function connectionStatusTone(status: string): string {
  if (status === "CONNECTED") return "bg-emerald-500/10 text-emerald-700";
  if (status === "ATTENTION" || status === "ERROR") return "bg-amber-500/10 text-amber-700";
  if (status === "QR_PENDING" || status === "CONNECTING" || status === "RECONNECTING") {
    return "bg-violet-500/10 text-violet-700";
  }
  return "bg-muted text-muted-foreground";
}

export function formatConnectionActivity(
  value: string | null | undefined,
  locale: string,
  never = "Nunca",
  now = Date.now(),
): string {
  if (!value) return never;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return never;
  const seconds = Math.round((timestamp - now) / 1000);
  const absolute = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (absolute < 60) return formatter.format(seconds, "second");
  if (absolute < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (absolute < 86_400) return formatter.format(Math.round(seconds / 3600), "hour");
  if (absolute < 2_592_000) return formatter.format(Math.round(seconds / 86_400), "day");
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(timestamp));
}
