import { describe, expect, it } from "vitest";
import type { Message } from "@/lib/types";
import {
  deliveryStatusAriaLabel,
  normalizeDeliveryStatus,
  normalizeMessageContent,
  outboundSenderDisplayName,
  shouldShowInboundSender,
} from "./message-content-utils";
import {
  formatMessageClock,
  formatMessageFullDateTime,
} from "./message-time-utils";

function baseMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: "m1",
    conversationId: "c1",
    body: "Olá",
    direction: "OUTBOUND",
    createdAt: "2026-08-05T17:32:00.000Z",
    status: "SENT",
    author: { id: "u1", name: "Isa Rezende" },
    ...overrides,
  };
}

describe("normalizeDeliveryStatus", () => {
  it("maps aliases without inventing read/delivered", () => {
    expect(normalizeDeliveryStatus("SENDING")).toBe("SENDING");
    expect(normalizeDeliveryStatus("PENDING")).toBe("SENDING");
    expect(normalizeDeliveryStatus("SENT")).toBe("SENT");
    expect(normalizeDeliveryStatus("DELIVERED")).toBe("DELIVERED");
    expect(normalizeDeliveryStatus("READ")).toBe("READ");
    expect(normalizeDeliveryStatus("FAILED")).toBe("FAILED");
    expect(normalizeDeliveryStatus("weird")).toBeNull();
  });

  it("uses SENT fallback only when persisted without status", () => {
    expect(normalizeDeliveryStatus(null)).toBeNull();
    expect(normalizeDeliveryStatus(undefined, { persisted: true })).toBe("SENT");
  });
});

describe("normalizeMessageContent", () => {
  it("uses body for TEXT", () => {
    const content = normalizeMessageContent(baseMessage({ body: "Linha 1\nLinha 2" }));
    expect(content.type).toBe("TEXT");
    expect(content.text).toBe("Linha 1\nLinha 2");
    expect(content.caption).toBeNull();
  });

  it("places media before caption and maps legacy body to caption", () => {
    const content = normalizeMessageContent(
      baseMessage({
        body: "Este é o modelo disponível.",
        attachments: [
          {
            id: "a1",
            fileName: "modelo.png",
            url: "/uploads/modelo.png",
            kind: "image",
            mimeType: "image/png",
            fileSize: 1200,
          },
        ],
      }),
    );
    expect(content.type).toBe("IMAGE");
    expect(content.isMedia).toBe(true);
    expect(content.text).toBeNull();
    expect(content.caption).toBe("Este é o modelo disponível.");
    expect(content.primaryAttachment?.fileName).toBe("modelo.png");
  });

  it("does not duplicate body as text when media caption exists", () => {
    const content = normalizeMessageContent(
      baseMessage({
        body: "legenda",
        attachments: [
          {
            id: "a1",
            fileName: "x.jpg",
            url: "/x.jpg",
            kind: "image",
          },
        ],
      }),
    );
    expect(content.text).toBeNull();
    expect(content.caption).toBe("legenda");
  });

  it("normalizes document and unsupported empty messages", () => {
    expect(
      normalizeMessageContent(
        baseMessage({
          body: null,
          attachments: [
            {
              id: "d1",
              fileName: "Catálogo.pdf",
              url: "/c.pdf",
              kind: "document",
              fileSize: 4800000,
            },
          ],
        }),
      ).type,
    ).toBe("DOCUMENT");

    expect(
      normalizeMessageContent(
        baseMessage({
          body: null,
          attachments: [],
          metadata: { messageType: "unknownWidget" },
        }),
      ).type,
    ).toBe("UNSUPPORTED");
  });

  it("treats voice hints as VOICE", () => {
    const content = normalizeMessageContent(
      baseMessage({
        body: null,
        attachments: [
          {
            id: "v1",
            fileName: "ptt.ogg",
            url: "/ptt.ogg",
            kind: "audio",
          },
        ],
        metadata: { isVoice: true },
      }),
    );
    expect(content.type).toBe("VOICE");
    expect(content.isVoice).toBe(true);
  });
});

describe("sender helpers", () => {
  it("hides inbound sender for individual chats", () => {
    expect(shouldShowInboundSender(undefined)).toBe(false);
    expect(shouldShowInboundSender("INDIVIDUAL")).toBe(false);
    expect(shouldShowInboundSender("GROUP")).toBe(true);
  });

  it("uses historical author with fallback", () => {
    expect(outboundSenderDisplayName(baseMessage())).toBe("Isa Rezende");
    expect(
      outboundSenderDisplayName(baseMessage({ author: null, senderType: null })),
    ).toBe("Equipe Xingyu");
    expect(
      outboundSenderDisplayName(
        baseMessage({ senderType: "automation", author: { id: "1", name: "X" } }),
      ),
    ).toBe("Automação");
  });
});

describe("message time utils", () => {
  it("formats clock and full datetime in America/Sao_Paulo", () => {
    const iso = "2026-08-05T17:32:00.000Z";
    expect(formatMessageClock(iso)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatMessageFullDateTime(iso)).toMatch(
      /^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/,
    );
  });

  it("handles invalid dates", () => {
    expect(formatMessageClock("not-a-date")).toBe("");
    expect(formatMessageFullDateTime(null)).toBe("");
  });
});

describe("deliveryStatusAriaLabel", () => {
  it("builds accessible labels", () => {
    expect(deliveryStatusAriaLabel("SENT", "05/08/2026 às 14:32")).toContain(
      "enviada",
    );
    expect(deliveryStatusAriaLabel("READ")).toContain("visualizada");
    expect(deliveryStatusAriaLabel("FAILED")).toBe("Falha no envio");
  });
});
