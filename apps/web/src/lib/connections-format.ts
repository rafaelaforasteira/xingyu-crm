import type { ComponentType } from "react";
import {
  Clock3,
  Instagram,
  Kanban,
  Mail,
  MessageCircle,
  Route,
  UserRound,
  UsersRound,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/crm/connections/whatsapp-icon";
import type { ConnectionListItem } from "./types";
import type { ConnectionsCopy } from "./connections-i18n";

export function connectionStatusLabel(status: string, copy: ConnectionsCopy): string {
  const labels: Record<string, string> = {
    CONNECTED: copy.statusConnected,
    ATTENTION: copy.statusAttention,
    ERROR: copy.statusError,
    RECONNECTING: copy.statusConnecting,
    OFFLINE: copy.statusOffline,
    DISCONNECTED: copy.statusOffline,
    DRAFT: copy.statusOffline,
    QR_PENDING: copy.statusPending,
    CONNECTING: copy.statusConnecting,
    ARCHIVED: copy.statusDeleted,
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

export type ConnectionMenuAction = "edit" | "disconnect" | "reconnect" | "delete";

/** Disconnect only while a live/pending session can still be torn down. */
export function connectionCanDisconnect(status: string): boolean {
  return (
    status === "CONNECTED" ||
    status === "QR_PENDING" ||
    status === "CONNECTING" ||
    status === "RECONNECTING"
  );
}

/** Reconnect only when offline/error — never while already connected or mid-pairing. */
export function connectionCanReconnect(status: string): boolean {
  return (
    status === "DISCONNECTED" ||
    status === "ERROR" ||
    status === "DRAFT" ||
    status === "OFFLINE"
  );
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

/** Safe scalar display — never coerce nested objects to "[object Object]". */
export function formatConnectionScalar(value: unknown, empty = "—"): string {
  if (value == null || value === "") return empty;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => formatConnectionScalar(item, ""))
      .filter(Boolean);
    return parts.length ? parts.join(", ") : empty;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.name === "string" && record.name.trim()) return record.name;
    if (typeof record.label === "string" && record.label.trim()) return record.label;
    return empty;
  }
  return empty;
}

export function connectionChannelType(connection: Pick<ConnectionListItem, "type" | "channel">) {
  return String(connection.type || connection.channel || "").trim().toUpperCase();
}

/** Manual / form-like origins are not live provider sessions. */
export function isManualConnection(connection: Pick<ConnectionListItem, "type" | "channel">) {
  const type = connectionChannelType(connection);
  return type === "MANUAL" || type === "FORM";
}

export function hasLinkedAccount(
  connection: Pick<ConnectionListItem, "displayAccount" | "phone">,
) {
  return Boolean(
    (connection.displayAccount && connection.displayAccount.trim()) ||
      (connection.phone && connection.phone.trim()),
  );
}

/**
 * Badge label respecting channel semantics:
 * MANUAL "CONNECTED" → Ativo (no external session language).
 */
export function connectionBadgeLabel(
  connection: Pick<ConnectionListItem, "status" | "type" | "channel">,
  copy: ConnectionsCopy,
): string {
  if (isManualConnection(connection)) {
    if (connection.status === "CONNECTED" || connection.status === "ACTIVE") {
      return copy.statusActive;
    }
    if (connection.status === "ARCHIVED") return copy.statusDeleted;
    return copy.statusManual;
  }
  return connectionStatusLabel(connection.status, copy);
}

export function connectionBadgeTone(
  connection: Pick<ConnectionListItem, "status" | "type" | "channel">,
): string {
  if (isManualConnection(connection)) {
    if (connection.status === "CONNECTED" || connection.status === "ACTIVE") {
      return "bg-emerald-500/10 text-emerald-700";
    }
    return "bg-muted text-muted-foreground";
  }
  return connectionStatusTone(connection.status);
}

/**
 * Second header line — never contradict a CONNECTED badge with "account not linked".
 */
export function connectionAccountLine(
  connection: Pick<
    ConnectionListItem,
    "status" | "type" | "channel" | "displayAccount" | "phone"
  > &
    Partial<Pick<ConnectionListItem, "provider">>,
  copy: ConnectionsCopy,
): string {
  if (isManualConnection(connection)) return copy.manualEntry;

  const account = (connection.displayAccount || connection.phone || "").trim();
  if (account) return account;

  if (connection.status === "CONNECTED") {
    return copy.accountLinked;
  }

  return copy.noAccount;
}

export function connectionDestinationParts(
  connection: Pick<ConnectionListItem, "defaultPipeline" | "defaultStage">,
) {
  return {
    pipelineName: connection.defaultPipeline?.name?.trim() || null,
    stageName: connection.defaultStage?.name?.trim() || null,
  };
}

/** @deprecated Prefer connectionDestinationParts for UI; kept for text-only fallbacks. */
export function connectionDestinationLabel(
  connection: Pick<ConnectionListItem, "defaultPipeline" | "defaultStage">,
  copy: ConnectionsCopy,
): string {
  const { pipelineName } = connectionDestinationParts(connection);
  if (!pipelineName) return copy.destinationUnset;
  return pipelineName;
}

export function connectionPipelinesLabel(
  count: number | null | undefined,
  copy: ConnectionsCopy,
): string {
  const n = count ?? 0;
  if (n <= 0) return copy.pipelinesNone;
  if (n === 1) return copy.pipelinesOne;
  return copy.pipelinesMany.replace("{count}", String(n));
}

export type ConnectionPipelinesSummary =
  | { mode: "empty" }
  | { mode: "single"; name: string }
  | { mode: "multi"; name: string; extra: number };

/**
 * Card summary for enabled pipelines: primary (default) chip + optional +N.
 * Uses defaultPipeline when available; does not invent names.
 */
export function connectionPipelinesSummary(
  connection: Pick<ConnectionListItem, "enabledPipelineCount" | "defaultPipeline">,
  copy: ConnectionsCopy,
): ConnectionPipelinesSummary {
  const count = connection.enabledPipelineCount ?? 0;
  if (count <= 0) return { mode: "empty" };
  const name =
    connection.defaultPipeline?.name?.trim() ||
    (count === 1 ? copy.pipelinesOne : copy.pipelinesMany.replace("{count}", String(count)));
  if (count === 1) return { mode: "single", name };
  return { mode: "multi", name, extra: count - 1 };
}

export function connectionAccessLabel(
  summary: string | null | undefined,
  copy: ConnectionsCopy,
): string {
  const value = (summary || "").trim();
  if (!value) return copy.accessUnset;
  if (/^organiza/i.test(value) || value === "Organization") return copy.accessOrganization;
  const usersMatch = value.match(/^(\d+)\s+usu[aá]rio/i);
  if (usersMatch) {
    const n = Number(usersMatch[1]);
    if (n <= 0) return copy.accessUnset;
    if (n === 1) return copy.accessOneUser;
    return copy.accessManyUsers.replace("{count}", String(n));
  }
  return value;
}

export type ConnectionChannelVisual = {
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
  containerClass: string;
  kind: string;
};

export function connectionChannelVisual(
  connection: Pick<ConnectionListItem, "type" | "channel">,
): ConnectionChannelVisual {
  const type = connectionChannelType(connection);
  if (type === "EMAIL") {
    return {
      icon: Mail,
      iconClass: "h-4 w-4",
      containerClass: "bg-sky-500/10 text-sky-700",
      kind: "email",
    };
  }
  if (type === "INSTAGRAM") {
    return {
      icon: Instagram,
      iconClass: "h-4 w-4",
      containerClass: "bg-fuchsia-500/10 text-fuchsia-700",
      kind: "instagram",
    };
  }
  if (type === "MANUAL" || type === "FORM") {
    return {
      icon: UserRound,
      iconClass: "h-4 w-4",
      containerClass: "bg-slate-500/10 text-slate-700",
      kind: "manual",
    };
  }
  if (type === "SITE_CHAT" || type === "WEB_CHAT") {
    return {
      icon: MessageCircle,
      iconClass: "h-4 w-4",
      containerClass: "bg-primary/10 text-primary",
      kind: "chat",
    };
  }
  if (type === "WHATSAPP" || !type) {
    return {
      icon: WhatsAppIcon,
      iconClass: "h-4 w-4",
      containerClass: "bg-emerald-500/10 text-emerald-700",
      kind: "whatsapp",
    };
  }
  return {
    icon: MessageCircle,
    iconClass: "h-4 w-4",
    containerClass: "bg-primary/10 text-primary",
    kind: "default",
  };
}

export const connectionMetaIcons = {
  destination: Route,
  pipelines: Kanban,
  access: UsersRound,
  activity: Clock3,
} as const;
