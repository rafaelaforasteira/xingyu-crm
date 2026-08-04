import { describe, expect, it, vi } from "vitest";
import {
  canSendMessage,
  conversationTimestamp,
  formatMessageMetaLine,
  isValidMessageBody,
  messageSenderLabel,
  normalizeConversations,
  normalizeMessages,
  shouldSendOnEnter,
  sortMessagesChronologically,
  translateMessageStatus,
} from "./inbox-utils";

const conversation = { id: "conv-1" };
const message = {
  id: "msg-1",
  conversationId: "conv-1",
  body: "Olá",
  direction: "INBOUND" as const,
  createdAt: "2026-07-30T10:00:00.000Z",
};

describe("Inbox response normalization", () => {
  it("normalizes conversation arrays and paginated responses", () => {
    expect(normalizeConversations([conversation])).toEqual([conversation]);
    expect(normalizeConversations({ data: [conversation], meta: {} })).toEqual([conversation]);
  });

  it("returns an empty conversation list for absent or invalid responses", () => {
    expect(normalizeConversations(undefined)).toEqual([]);
    expect(normalizeConversations(null)).toEqual([]);
    expect(normalizeConversations({ data: "invalid" })).toEqual([]);
    expect(normalizeConversations({ data: [{}] })).toEqual([]);
  });

  it("normalizes message arrays and paginated responses", () => {
    expect(normalizeMessages([message])).toEqual([
      expect.objectContaining(message),
    ]);
    expect(normalizeMessages({ data: [message], meta: {} })).toEqual([
      expect.objectContaining(message),
    ]);
  });

  it("returns an empty message list for absent or invalid responses", () => {
    expect(normalizeMessages(undefined)).toEqual([]);
    expect(normalizeMessages(null)).toEqual([]);
    expect(normalizeMessages({ data: "invalid" })).toEqual([]);
    expect(normalizeMessages({ data: [{ id: "incomplete" }] })).toEqual([]);
  });

  it("keeps attachment-only messages and maps sender to author", () => {
    const normalized = normalizeMessages([
      {
        id: "msg-att",
        conversationId: "conv-1",
        body: null,
        direction: "OUTBOUND",
        sentAt: "2026-08-04T12:00:00.000Z",
        sender: { id: "u1", name: "Ana" },
        attachments: [
          {
            id: "a1",
            fileName: "pedido.pdf",
            url: "/api/uploads/files/x.pdf",
            kind: "document",
            fileSize: 1200,
          },
        ],
      },
    ]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.author).toEqual({ id: "u1", name: "Ana" });
    expect(normalized[0]?.attachments?.[0]?.fileName).toBe("pedido.pdf");
  });

  it("keeps historical outbound messages without sender", () => {
    const normalized = normalizeMessages([
      {
        id: "msg-old",
        conversationId: "conv-1",
        body: "Histórico",
        direction: "OUTBOUND",
        createdAt: "2026-07-01T10:00:00.000Z",
        sender: null,
      },
    ]);
    expect(normalized[0]?.author).toBeNull();
    expect(messageSenderLabel(normalized[0]!)).toBe("Enviado por: Equipe Xingyu");
  });
});

describe("Inbox deterministic helpers", () => {
  it("sorts messages without mutating the API response", () => {
    const later = { ...message, id: "msg-2", createdAt: "2026-07-30T11:00:00.000Z" };
    const source = [later, message];
    expect(sortMessagesChronologically(source).map((item) => item.id)).toEqual([
      "msg-1",
      "msg-2",
    ]);
    expect(source[0]?.id).toBe("msg-2");
  });

  it("uses a stable timestamp before mount and formats it afterwards", () => {
    const formatter = vi.fn(() => "há 1 minuto");
    expect(conversationTimestamp(null, message.createdAt, false, formatter)).toBe(
      "Última interação",
    );
    expect(formatter).not.toHaveBeenCalled();
    expect(conversationTimestamp(null, message.createdAt, true, formatter)).toBe("há 1 minuto");
  });

  it("does not send blank messages", () => {
    expect(isValidMessageBody("   ")).toBe(false);
    expect(isValidMessageBody(" mensagem ")).toBe(true);
    expect(canSendMessage("   ", 0)).toBe(false);
    expect(canSendMessage("", 1)).toBe(true);
  });

  it("translates statuses and labels senders", () => {
    expect(translateMessageStatus("SENT")).toBe("Enviado");
    expect(translateMessageStatus("SENDING")).toBe("Enviando");
    expect(messageSenderLabel({ direction: "INBOUND", author: null })).toBe(
      "Recebido de: Cliente",
    );
    expect(
      messageSenderLabel({
        direction: "OUTBOUND",
        author: { id: "1", name: "Raffaela" },
        senderType: "automation",
      }),
    ).toBe("Enviado por: Automação");
    expect(
      formatMessageMetaLine(
        {
          direction: "OUTBOUND",
          author: { id: "1", name: "Raffaela" },
          createdAt: "2026-08-04T17:32:00.000Z",
        },
        null,
        true,
        (_value, pattern) => (pattern === "HH:mm" ? "14:32" : "04/08/2026"),
      ),
    ).toBe("Enviado por: Raffaela - 14:32 - 04/08/2026");
  });

  it("sends on Enter unless Shift or IME composition is active", () => {
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: false, isComposing: false, keyCode: 13 })).toBe(
      true,
    );
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: true, isComposing: false, keyCode: 13 })).toBe(
      false,
    );
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: false, isComposing: true, keyCode: 13 })).toBe(
      false,
    );
    expect(shouldSendOnEnter({ key: "Enter", shiftKey: false, isComposing: false, keyCode: 229 })).toBe(
      false,
    );
  });
});
