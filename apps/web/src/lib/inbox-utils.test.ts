import { describe, expect, it, vi } from "vitest";
import {
  buildMessageTimeline,
  canSendMessage,
  conversationTimestamp,
  formatMessageDayLabel,
  formatMessageMetaLine,
  isValidMessageBody,
  mergeMessagePages,
  messageDayKey,
  messageSenderLabel,
  normalizeConversations,
  normalizeMessages,
  shouldSendOnEnter,
  sortMessagesChronologically,
  translateMessageStatus,
} from "./inbox-utils";
import type { Message } from "./types";

const conversation = { id: "conv-1" };
const message = {
  id: "msg-1",
  conversationId: "conv-1",
  body: "Olá",
  direction: "INBOUND" as const,
  createdAt: "2026-07-30T10:00:00.000Z",
};

function msg(
  partial: Partial<Message> & Pick<Message, "id" | "createdAt" | "direction">,
): Message {
  return {
    conversationId: "conv-1",
    body: partial.body ?? "x",
    author: partial.author ?? null,
    ...partial,
  };
}

describe("Inbox response normalization", () => {
  it("normalizes conversation arrays and paginated responses", () => {
    expect(normalizeConversations([conversation])).toEqual([conversation]);
    expect(normalizeConversations({ data: [conversation], meta: {} })).toEqual([
      conversation,
    ]);
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

  it("preserves paragraph breaks in body text", () => {
    const normalized = normalizeMessages([
      {
        id: "msg-break",
        conversationId: "conv-1",
        body: "Linha 1\n\nLinha 2",
        direction: "INBOUND",
        createdAt: "2026-08-04T12:00:00.000Z",
      },
    ]);
    expect(normalized[0]?.body).toBe("Linha 1\n\nLinha 2");
  });
});

describe("Message timeline and pagination helpers", () => {
  it("sorts messages chronologically without mutating source", () => {
    const later = { ...message, id: "msg-2", createdAt: "2026-07-30T11:00:00.000Z" };
    const source = [later, message];
    expect(sortMessagesChronologically(source).map((item) => item.id)).toEqual([
      "msg-1",
      "msg-2",
    ]);
    expect(source[0]?.id).toBe("msg-2");
  });

  it("dedupes merged pages and keeps chronological order", () => {
    const older = [
      msg({ id: "a", createdAt: "2026-08-01T10:00:00.000Z", direction: "INBOUND" }),
      msg({ id: "b", createdAt: "2026-08-01T11:00:00.000Z", direction: "OUTBOUND" }),
    ];
    const current = [
      msg({
        id: "b",
        createdAt: "2026-08-01T11:00:00.000Z",
        direction: "OUTBOUND",
        body: "dup",
      }),
      msg({ id: "c", createdAt: "2026-08-01T12:00:00.000Z", direction: "INBOUND" }),
    ];
    expect(mergeMessagePages(older, current).map((item) => item.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("formats day labels as Hoje, Ontem or dd/MM/yyyy in America/Sao_Paulo", () => {
    const now = new Date("2026-08-05T15:00:00.000-03:00");
    expect(formatMessageDayLabel(messageDayKey(now, "America/Sao_Paulo"), now)).toBe(
      "Hoje",
    );
    const yesterday = new Date("2026-08-04T15:00:00.000-03:00");
    expect(
      formatMessageDayLabel(messageDayKey(yesterday, "America/Sao_Paulo"), now),
    ).toBe("Ontem");
    expect(formatMessageDayLabel("2026-07-31", now)).toBe("31/07/2026");
  });

  it("groups messages with a single separator per day", () => {
    const now = new Date("2026-08-05T18:00:00.000-03:00");
    const timeline = buildMessageTimeline(
      [
        msg({
          id: "1",
          createdAt: "2026-08-04T12:00:00.000-03:00",
          direction: "INBOUND",
        }),
        msg({
          id: "2",
          createdAt: "2026-08-04T13:00:00.000-03:00",
          direction: "OUTBOUND",
        }),
        msg({
          id: "3",
          createdAt: "2026-08-05T09:00:00.000-03:00",
          direction: "INBOUND",
        }),
      ],
      now,
    );
    const days = timeline.filter((item) => item.type === "day");
    expect(days).toHaveLength(2);
    expect(days[0]).toMatchObject({ type: "day", label: "Ontem" });
    expect(days[1]).toMatchObject({ type: "day", label: "Hoje" });
  });

  it("returns empty timeline for conversation without messages", () => {
    expect(buildMessageTimeline([])).toEqual([]);
  });
});

describe("Inbox deterministic helpers", () => {
  it("uses a stable timestamp before mount and formats it afterwards", () => {
    const formatter = vi.fn(() => "há 1 minuto");
    expect(conversationTimestamp(null, message.createdAt, false, formatter)).toBe(
      "Última interação",
    );
    expect(formatter).not.toHaveBeenCalled();
    expect(conversationTimestamp(null, message.createdAt, true, formatter)).toBe(
      "há 1 minuto",
    );
  });

  it("does not send blank messages", () => {
    expect(isValidMessageBody("   ")).toBe(false);
    expect(isValidMessageBody(" mensagem ")).toBe(true);
    expect(canSendMessage("   ", 0)).toBe(false);
    expect(canSendMessage("", 1)).toBe(true);
  });

  it("translates statuses and labels senders", () => {
    expect(translateMessageStatus("SENT")).toBe("Enviado");
    expect(translateMessageStatus("DELIVERED")).toBe("Entregue");
    expect(translateMessageStatus("READ")).toBe("Lido");
    expect(translateMessageStatus("FAILED")).toBe("Falhou");
    expect(translateMessageStatus("SENDING")).toBe("Enviando");
    expect(messageSenderLabel({ direction: "INBOUND", author: null })).toBe(
      "Recebido de: Cliente",
    );
    expect(
      messageSenderLabel(
        {
          direction: "INBOUND",
          author: null,
        },
        "Cláudia Nunes",
      ),
    ).toBe("Recebido de: Cláudia Nunes");
    expect(
      messageSenderLabel({
        direction: "OUTBOUND",
        author: { id: "1", name: "Administradora Xingyu" },
      }),
    ).toBe("Enviado por: Administradora Xingyu");
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
    ).toBe("Enviado por: Raffaela · 14:32 · 04/08/2026");
  });

  it("sends on Enter unless Shift or IME composition is active", () => {
    expect(
      shouldSendOnEnter({
        key: "Enter",
        shiftKey: false,
        isComposing: false,
        keyCode: 13,
      }),
    ).toBe(true);
    expect(
      shouldSendOnEnter({
        key: "Enter",
        shiftKey: true,
        isComposing: false,
        keyCode: 13,
      }),
    ).toBe(false);
    expect(
      shouldSendOnEnter({
        key: "Enter",
        shiftKey: false,
        isComposing: true,
        keyCode: 13,
      }),
    ).toBe(false);
    expect(
      shouldSendOnEnter({
        key: "Enter",
        shiftKey: false,
        isComposing: false,
        keyCode: 229,
      }),
    ).toBe(false);
  });
});
