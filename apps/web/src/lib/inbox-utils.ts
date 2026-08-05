import type {
  Conversation,
  ConversationListItem,
  Message,
  MessageAttachment,
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

function normalizeAttachment(value: unknown): MessageAttachment | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.url !== "string") {
    return null;
  }
  const fileName =
    typeof value.fileName === "string"
      ? value.fileName
      : typeof value.filename === "string"
        ? value.filename
        : "arquivo";
  return {
    id: value.id,
    fileName,
    mimeType: typeof value.mimeType === "string" ? value.mimeType : null,
    fileSize: typeof value.fileSize === "number" ? value.fileSize : null,
    url: value.url,
    kind: typeof value.kind === "string" ? value.kind : "document",
    createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
  };
}

function normalizeMessageRecord(value: Record<string, unknown>): Message | null {
  if (
    typeof value.id !== "string" ||
    typeof value.conversationId !== "string" ||
    (value.direction !== "INBOUND" &&
      value.direction !== "OUTBOUND" &&
      value.direction !== "INTERNAL")
  ) {
    return null;
  }

  if (!("body" in value) && !Array.isArray(value.attachments)) return null;
  if (value.body != null && typeof value.body !== "string") return null;

  const attachments = Array.isArray(value.attachments)
    ? value.attachments
        .map(normalizeAttachment)
        .filter((item): item is MessageAttachment => item !== null)
    : [];
  const body = typeof value.body === "string" ? value.body : null;
  if (!body?.trim() && attachments.length === 0) return null;

  const createdAt =
    typeof value.createdAt === "string"
      ? value.createdAt
      : typeof value.sentAt === "string"
        ? value.sentAt
        : null;
  if (!createdAt) return null;

  const sender = isRecord(value.sender) ? value.sender : null;
  const author = isRecord(value.author) ? value.author : sender;
  const metadata = isRecord(value.metadata) ? value.metadata : null;
  const senderType =
    typeof value.senderType === "string"
      ? value.senderType
      : metadata && typeof metadata.senderType === "string"
        ? metadata.senderType
        : null;

  return {
    id: value.id,
    conversationId: value.conversationId,
    body,
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
          }
        : null,
    senderType,
    createdAt,
    status: typeof value.status === "string" ? value.status : undefined,
    attachments,
    metadata,
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

export function canSendMessage(body: string, attachmentCount = 0): boolean {
  return isValidMessageBody(body) || attachmentCount > 0;
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

export function translateMessageStatus(status?: string | null): string | null {
  if (!status) return null;
  const map: Record<string, string> = {
    SENDING: "Enviando",
    PENDING: "Enviando",
    SENT: "Enviado",
    DELIVERED: "Entregue",
    READ: "Lido",
    FAILED: "Falhou",
  };
  return map[status.toUpperCase()] ?? null;
}

export function messageSenderLabel(
  message: Pick<Message, "direction" | "author" | "senderType">,
  inboundName?: string | null,
): string {
  if (message.senderType === "automation") {
    return "Enviado por: Automação";
  }
  if (message.direction === "INBOUND") {
    const name = inboundName?.trim() || "Cliente";
    return `Recebido de: ${name}`;
  }
  const name = message.author?.name?.trim() || "Equipe Xingyu";
  return `Enviado por: ${name}`;
}

export function formatMessageMetaLine(
  message: Pick<Message, "direction" | "author" | "senderType" | "createdAt">,
  inboundName: string | null | undefined,
  mounted: boolean,
  formatDateFn: (value: string, pattern: string) => string,
): string {
  const who = messageSenderLabel(message, inboundName);
  if (!mounted) return who;
  const time = formatDateFn(message.createdAt, "HH:mm");
  const date = formatDateFn(message.createdAt, "dd/MM/yyyy");
  return `${who} · ${time} · ${date}`;
}

export function shouldSendOnEnter(event: {
  key: string;
  shiftKey: boolean;
  isComposing?: boolean;
  keyCode?: number;
  nativeEvent?: { isComposing?: boolean };
}): boolean {
  if (event.key !== "Enter" || event.shiftKey) return false;
  const composing =
    event.isComposing === true ||
    event.nativeEvent?.isComposing === true ||
    event.keyCode === 229;
  if (composing) return false;
  return true;
}

export function formatAttachmentSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function resolveAttachmentUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
    "http://localhost:3333/api";
  const origin = apiBase.replace(/\/api\/?$/, "");
  return url.startsWith("/") ? `${origin}${url}` : `${origin}/${url}`;
}
