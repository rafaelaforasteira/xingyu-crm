/**
 * Waiting-for-reply detection.
 *
 * A conversation is awaiting a reply when:
 * - status is OPEN (not closed/archived);
 * - the latest non-internal message is INBOUND (from the contact/client).
 *
 * Unread count is intentionally ignored: a read conversation can still be waiting.
 *
 * MessageDirection values come from Prisma (`INBOUND` | `OUTBOUND`).
 */

export type WaitingKind = "first_response" | "follow_up";

export function isConversationAwaitingReply(input: {
  status?: string | null;
  lastMessageDirection?: string | null;
}): boolean {
  if ((input.status ?? "").toUpperCase() !== "OPEN") return false;
  return (input.lastMessageDirection ?? "").toUpperCase() === "INBOUND";
}

export function classifyWaitingKind(hasPriorOutbound: boolean): WaitingKind {
  return hasPriorOutbound ? "follow_up" : "first_response";
}

export function waitingKindLabel(kind: WaitingKind): string {
  return kind === "first_response"
    ? "Aguardando primeira resposta"
    : "Aguardando retorno";
}

/** Waiting duration in whole minutes from the client's last message. */
export function waitingMinutesSince(lastClientMessageAt: Date | string, now = new Date()): number {
  const at =
    typeof lastClientMessageAt === "string"
      ? new Date(lastClientMessageAt)
      : lastClientMessageAt;
  return Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000));
}

export function formatWaitingDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return rem > 0 ? `${hours}h${String(rem).padStart(2, "0")}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}
