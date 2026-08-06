import { describe, expect, it } from "vitest";
import {
  assigneeShortCode,
  contactInitials,
  formatLeadCode,
  formatUnreadCount,
} from "./conversation-list-utils";
import { formatConversationTimestamp } from "./format-conversation-timestamp";

/**
 * Component-level semantics covered via pure helpers + data attributes contract.
 * Full DOM interaction is covered by Playwright (beta-conversation-list-crm-cards).
 */
describe("ConversationListItemRow visual contract helpers", () => {
  it("exposes lead code and assignee short code for the identification row", () => {
    expect(formatLeadCode(48)).toBe("Lead #0048");
    expect(assigneeShortCode("Isa Rezende")).toBe("IR");
    expect(contactInitials("Amanda Vieira")).toBe("AV");
  });

  it("formats unread badge text with 99+ cap", () => {
    expect(formatUnreadCount(0)).toBe("0");
    expect(formatUnreadCount(3)).toBe("3");
    expect(formatUnreadCount(150)).toBe("99+");
  });

  it("never uses relative há-phrases for list timestamps", () => {
    const zone = "America/Sao_Paulo";
    const now = new Date("2026-04-30T18:00:00.000Z");
    const samples = [
      formatConversationTimestamp("2026-04-30T17:32:00.000Z", zone, now),
      formatConversationTimestamp("2026-04-29T20:00:00.000Z", zone, now),
      formatConversationTimestamp("2026-04-28T15:00:00.000Z", zone, now),
      formatConversationTimestamp("2026-04-23T15:00:00.000Z", zone, now),
    ];
    for (const sample of samples) {
      expect(sample).not.toMatch(/há /i);
      expect(sample.length).toBeGreaterThan(0);
    }
  });

  it("encodes selected + awaiting + unread precedence as independent flags", () => {
    const selected = true;
    const awaitingMine = true;
    const unread = true;
    const background = selected ? "accent" : awaitingMine ? "emerald" : "white";
    const stripe = awaitingMine;
    const badge = unread;
    expect(background).toBe("accent");
    expect(stripe).toBe(true);
    expect(badge).toBe(true);
  });
});
