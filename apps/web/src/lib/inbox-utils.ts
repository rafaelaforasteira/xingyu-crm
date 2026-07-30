import type {
  Conversation,
  ConversationListItem,
  Message,
  MessageCursorPage,
} from "./types";

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

function normalizeMessageRecord(value: Record<string, unknown>): Message | null {
  if (
    typeof value.id !== "string" ||
    typeof value.conversationId !== "string" ||
    typeof value.body !== "string" ||
    (value.direction !== "INBOUND" &&
      value.direction !== "OUTBOUND" &&
      value.direction !== "INTERNAL")
  ) {
    return null;
  }

  const createdAt =
    typeof value.createdAt === "string"
      ? value.createdAt
      : typeof value.sentAt === "string"
        ? value.sentAt
        : null;
  if (!createdAt) return null;

  const sender = isRecord(value.sender) ? value.sender : null;
  const author = isRecord(value.author) ? value.author : sender;

  return {
    id: value.id,
    conversationId: value.conversationId,
    body: value.body,
    direction: value.direction,
    channel: typeof value.channel === "string" ? value.channel : undefined,
    authorId:
      typeof value.authorId === "string"
        ? value.authorId
        : typeof value.senderId === "string"
          ? value.senderId
          : author && typeof author.id === "string"
            ? author.id
            : null,
    author:
      author && typeof author.name === "string"
        ? {
            id: typeof author.id === "string" ? author.id : "",
            name: author.name,
            avatarUrl:
              typeof author.avatarUrl === "string" ? author.avatarUrl : null,
          }
        : null,
    createdAt,
    status: typeof value.status === "string" ? value.status : undefined,
  };
}

export function normalizeConversations(response: unknown): Conversation[] {
  return collectionData(response).filter(isConversation);
}

export function normalizeConversationListItems(
  response: unknown,
): ConversationListItem[] {
  return collectionData(response).filter(
    (item): item is ConversationListItem =>
      isRecord(item) && typeof item.id === "string" && typeof item.status === "string",
  );
}

export function normalizeMessages(response: unknown): Message[] {
  if (isRecord(response) && !Array.isArray(response.data) && typeof response.id === "string") {
    const single = normalizeMessageRecord(response);
    return single ? [single] : [];
  }
  if (isRecord(response) && Array.isArray(response.data)) {
    return response.data
      .map((item) => (isRecord(item) ? normalizeMessageRecord(item) : null))
      .filter((item): item is Message => item !== null);
  }
  return collectionData(response)
    .map((item) => (isRecord(item) ? normalizeMessageRecord(item) : null))
    .filter((item): item is Message => item !== null);
}

export function unwrapMessageCursorPage(response: unknown): MessageCursorPage {
  const data = normalizeMessages(response);
  const meta = isRecord(response) && isRecord(response.meta) ? response.meta : {};
  return {
    data,
    meta: {
      pageSize: typeof meta.pageSize === "number" ? meta.pageSize : data.length,
      hasMore: Boolean(meta.hasMore),
      nextCursor:
        typeof meta.nextCursor === "string" ? meta.nextCursor : null,
    },
  };
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
