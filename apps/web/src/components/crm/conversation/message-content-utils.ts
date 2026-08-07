import type { Message, MessageAttachment } from "@/lib/types";

export const MESSAGE_TIME_ZONE = "America/Sao_Paulo";

export type NormalizedMessageType =
  | "TEXT"
  | "IMAGE"
  | "VIDEO"
  | "AUDIO"
  | "VOICE"
  | "DOCUMENT"
  | "STICKER"
  | "UNSUPPORTED";

export type NormalizedDeliveryStatus =
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export type AudioKind = "VOICE" | "AUDIO";

export type NormalizedAttachment = MessageAttachment & {
  mediaUrl: string;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
};

export type NormalizedMessageContent = {
  type: NormalizedMessageType;
  text: string | null;
  caption: string | null;
  attachments: NormalizedAttachment[];
  primaryAttachment: NormalizedAttachment | null;
  isMedia: boolean;
  isVoice: boolean;
  isUnsupported: boolean;
  audioKind: AudioKind | null;
};

const STATUS_ALIASES: Record<string, NormalizedDeliveryStatus> = {
  SENDING: "SENDING",
  PENDING: "SENDING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  READ: "READ",
  FAILED: "FAILED",
};

const TYPE_ALIASES: Record<string, NormalizedMessageType> = {
  TEXT: "TEXT",
  CONVERSATION: "TEXT",
  EXTENDEDTEXTMESSAGE: "TEXT",
  IMAGE: "IMAGE",
  IMAGEMESSAGE: "IMAGE",
  VIDEO: "VIDEO",
  VIDEOMESSAGE: "VIDEO",
  AUDIO: "AUDIO",
  AUDIOMESSAGE: "AUDIO",
  VOICE: "VOICE",
  PTT: "VOICE",
  DOCUMENT: "DOCUMENT",
  DOCUMENTMESSAGE: "DOCUMENT",
  FILE: "DOCUMENT",
  STICKER: "STICKER",
  STICKERMESSAGE: "STICKER",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function attachmentKindToType(kind: string | undefined): NormalizedMessageType {
  const key = (kind ?? "document").toUpperCase();
  if (key === "IMAGE") return "IMAGE";
  if (key === "VIDEO") return "VIDEO";
  if (key === "AUDIO") return "AUDIO";
  if (key === "VOICE" || key === "PTT") return "VOICE";
  if (key === "STICKER") return "STICKER";
  if (key === "DOCUMENT" || key === "FILE") return "DOCUMENT";
  return "DOCUMENT";
}

function metadataType(message: Message): NormalizedMessageType | null {
  const meta = message.metadata;
  if (!isRecord(meta)) return null;
  const raw =
    typeof meta.messageType === "string"
      ? meta.messageType
      : typeof meta.type === "string"
        ? meta.type
        : null;
  if (!raw) return null;
  return TYPE_ALIASES[raw.replace(/[^a-zA-Z]/g, "").toUpperCase()] ?? null;
}

function isVoiceHint(message: Message, attachment: MessageAttachment | null): boolean {
  const meta = message.metadata;
  if (isRecord(meta)) {
    if (meta.isVoice === true || meta.ptt === true) return true;
    if (typeof meta.audioKind === "string" && meta.audioKind.toUpperCase() === "VOICE") {
      return true;
    }
  }
  if (!attachment) return false;
  const kind = attachment.kind?.toLowerCase() ?? "";
  if (kind === "voice" || kind === "ptt") return true;
  const name = attachment.fileName?.toLowerCase() ?? "";
  return name.includes("voice") || name.startsWith("audio-");
}

function toNormalizedAttachment(attachment: MessageAttachment): NormalizedAttachment {
  return {
    ...attachment,
    mediaUrl: attachment.url,
    thumbnailUrl: null,
    durationSeconds: null,
    width: null,
    height: null,
  };
}

/**
 * Central content normalizer for bubble rendering.
 * Legacy rule: when media exists and body is present, body becomes caption.
 */
export function normalizeMessageContent(message: Message): NormalizedMessageContent {
  const attachments = (message.attachments ?? []).map(toNormalizedAttachment);
  const primary = attachments[0] ?? null;
  const body = message.body?.trim() ? message.body : null;
  const explicitType = metadataType(message);

  let type: NormalizedMessageType = "TEXT";
  if (explicitType) {
    type = explicitType;
  } else if (primary) {
    type = attachmentKindToType(primary.kind);
  } else if (body) {
    type = "TEXT";
  } else {
    type = "UNSUPPORTED";
  }

  const isVoice =
    type === "VOICE" || (type === "AUDIO" && isVoiceHint(message, primary));
  if (isVoice) type = "VOICE";

  const isMedia =
    type === "IMAGE" ||
    type === "VIDEO" ||
    type === "AUDIO" ||
    type === "VOICE" ||
    type === "DOCUMENT" ||
    type === "STICKER";

  let text: string | null = null;
  let caption: string | null = null;
  if (type === "TEXT") {
    text = body;
  } else if (isMedia) {
    caption = body;
  } else {
    text = body;
  }

  const isUnsupported = type === "UNSUPPORTED" && !text && attachments.length === 0;

  return {
    type: isUnsupported ? "UNSUPPORTED" : type,
    text,
    caption,
    attachments,
    primaryAttachment: primary,
    isMedia,
    isVoice,
    isUnsupported: type === "UNSUPPORTED" || isUnsupported,
    audioKind: type === "VOICE" ? "VOICE" : type === "AUDIO" ? "AUDIO" : null,
  };
}

/**
 * Normalize delivery status aliases. Returns null for unknown/empty.
 * Does not invent READ/DELIVERED — only maps explicit values.
 */
export function normalizeDeliveryStatus(
  status?: string | null,
  options?: { persisted?: boolean },
): NormalizedDeliveryStatus | null {
  if (!status?.trim()) {
    return options?.persisted ? "SENT" : null;
  }
  const key = status.trim().toUpperCase();
  return STATUS_ALIASES[key] ?? null;
}

export function shouldShowInboundSender(conversationType?: string | null): boolean {
  return conversationType?.toUpperCase() === "GROUP";
}

export function outboundSenderDisplayName(
  message: Pick<Message, "author" | "senderType">,
): string {
  if (message.senderType === "automation") return "Automação";
  const name = message.author?.name?.trim();
  return name || "Equipe Xingyu";
}

export function deliveryStatusAriaLabel(
  status: NormalizedDeliveryStatus,
  fullDateTime?: string | null,
): string {
  const when = fullDateTime?.trim() ? ` em ${fullDateTime}` : "";
  switch (status) {
    case "SENDING":
      return "Mensagem enviando";
    case "SENT":
      return `Mensagem enviada${when}`;
    case "DELIVERED":
      return `Mensagem entregue${when}`;
    case "READ":
      return `Mensagem visualizada${when}`;
    case "FAILED":
      return "Falha no envio";
    default:
      return "Status da mensagem";
  }
}
