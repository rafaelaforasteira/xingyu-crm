import { describe, expect, it, vi } from "vitest";
import {
  conversationTimestamp,
  isValidMessageBody,
  normalizeConversations,
  normalizeMessages,
  sortMessagesChronologically,
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
    expect(normalizeMessages([message])).toEqual([message]);
    expect(normalizeMessages({ data: [message], meta: {} })).toEqual([message]);
  });

  it("returns an empty message list for absent or invalid responses", () => {
    expect(normalizeMessages(undefined)).toEqual([]);
    expect(normalizeMessages(null)).toEqual([]);
    expect(normalizeMessages({ data: "invalid" })).toEqual([]);
    expect(normalizeMessages({ data: [{ id: "incomplete" }] })).toEqual([]);
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
  });
});
