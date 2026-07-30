import type { Conversation, Message } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectionData(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  if (isRecord(response) && Array.isArray(response.data)) return response.data;
  return [];
}

function isConversation(value: unknown): value is Conversation {
  return isRecord(value) && typeof value.id === "string";
}

function isMessage(value: unknown): value is Message {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.conversationId === "string" &&
    typeof value.body === "string" &&
    typeof value.createdAt === "string" &&
    (value.direction === "INBOUND" ||
      value.direction === "OUTBOUND" ||
      value.direction === "INTERNAL")
  );
}

export function normalizeConversations(response: unknown): Conversation[] {
  return collectionData(response).filter(isConversation);
}

export function normalizeMessages(response: unknown): Message[] {
  return collectionData(response).filter(isMessage);
}

export function sortMessagesChronologically(messages: Message[]): Message[] {
  return [...messages].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function isValidMessageBody(body: string): boolean {
  return body.trim().length > 0;
}

export function conversationTimestamp(
  preview: string | null | undefined,
  lastMessageAt: string | null | undefined,
  mounted: boolean,
  formatter: (value: string) => string,
): string {
  if (preview) return preview;
  if (mounted && lastMessageAt) return formatter(lastMessageAt);
  return "Última interação";
}

export function contactName(contact: unknown): string {
  if (!isRecord(contact)) return "Conversa";
  if (typeof contact.name === "string" && contact.name.trim()) return contact.name;
  const firstName = typeof contact.firstName === "string" ? contact.firstName : "";
  const lastName = typeof contact.lastName === "string" ? contact.lastName : "";
  return `${firstName} ${lastName}`.trim() || "Conversa";
}

export function channelName(channel: unknown): string {
  if (typeof channel === "string" && channel.trim()) return channel;
  if (!isRecord(channel)) return "Canal não informado";
  if (typeof channel.name === "string" && channel.name.trim()) return channel.name;
  if (typeof channel.type === "string" && channel.type.trim()) return channel.type;
  return "Canal não informado";
}
