import { describe, expect, it } from "vitest";
import { formatConversationTimestamp } from "./format-conversation-timestamp";
import {
  assigneeShortCode,
  channelDisplayLabel,
  contactInitials,
  conversationContactDisplayName,
  conversationPreviewText,
  formatLeadCode,
  formatUnreadCount,
} from "./conversation-list-utils";

describe("formatLeadCode", () => {
  it("pads and formats sequences", () => {
    expect(formatLeadCode(1)).toBe("Lead #0001");
    expect(formatLeadCode(9)).toBe("Lead #0009");
    expect(formatLeadCode(48)).toBe("Lead #0048");
    expect(formatLeadCode(9999)).toBe("Lead #9999");
    expect(formatLeadCode(10000)).toBe("Lead #10000");
  });

  it("handles invalid values", () => {
    expect(formatLeadCode(null)).toBeNull();
    expect(formatLeadCode(undefined)).toBeNull();
    expect(formatLeadCode(0)).toBeNull();
  });
});

describe("contactInitials", () => {
  it("derives initials from names", () => {
    expect(contactInitials("Amanda Vieira")).toBe("AV");
    expect(contactInitials("Cláudia Nunes")).toBe("CN");
    expect(contactInitials("Maria da Silva")).toBe("MS");
    expect(contactInitials("Isa")).toBe("IS");
  });

  it("falls back for phone and empty labels", () => {
    expect(contactInitials("Contato sem nome")).toBeNull();
    expect(contactInitials("+55 11 99999-0001")).toBeNull();
    expect(contactInitials("")).toBeNull();
    expect(contactInitials("Lead #0001")).toBeNull();
  });
});

describe("assigneeShortCode", () => {
  it("builds short codes", () => {
    expect(assigneeShortCode("Isa Rezende")).toBe("IR");
    expect(assigneeShortCode("Maria da Silva")).toBe("MS");
    expect(assigneeShortCode("Isa")).toBe("IS");
    expect(assigneeShortCode("Cláudia Nunes")).toBe("CN");
    expect(assigneeShortCode(null)).toBeNull();
    expect(assigneeShortCode("   ")).toBeNull();
  });
});

describe("conversationContactDisplayName", () => {
  it("prefers CRM name then phone", () => {
    expect(
      conversationContactDisplayName({ firstName: "Amanda", lastName: "Vieira" }),
    ).toBe("Amanda Vieira");
    expect(
      conversationContactDisplayName({
        firstName: "",
        lastName: "",
        phone: "5511999990001",
      }),
    ).toMatch(/\+55/);
    expect(conversationContactDisplayName(null)).toBe("Contato sem nome");
  });
});

describe("formatUnreadCount", () => {
  it("caps at 99+", () => {
    expect(formatUnreadCount(3)).toBe("3");
    expect(formatUnreadCount(99)).toBe("99");
    expect(formatUnreadCount(100)).toBe("99+");
  });
});

describe("conversationPreviewText / channelDisplayLabel", () => {
  it("uses placeholders and displayName", () => {
    expect(conversationPreviewText(null)).toBe("Sem mensagens ainda");
    expect(conversationPreviewText("Olá")).toBe("Olá");
    expect(
      channelDisplayLabel({
        displayName: "WhatsApp Xingyu",
        name: "wa",
        type: "WHATSAPP",
      }),
    ).toBe("WhatsApp Xingyu");
  });
});

describe("formatConversationTimestamp", () => {
  const zone = "America/Sao_Paulo";
  const now = new Date("2026-04-30T18:00:00.000Z");

  it("formats today as time", () => {
    expect(
      formatConversationTimestamp("2026-04-30T17:32:00.000Z", zone, now),
    ).toBe("14:32");
  });

  it("formats yesterday", () => {
    expect(
      formatConversationTimestamp("2026-04-29T20:00:00.000Z", zone, now),
    ).toBe("Ontem");
  });

  it("formats weekday within six days", () => {
    const label = formatConversationTimestamp(
      "2026-04-28T15:00:00.000Z",
      zone,
      now,
    );
    expect(label.toLowerCase()).toMatch(
      /terça|terca|segunda|quarta|quinta|sexta|sábado|sabado|domingo/,
    );
  });

  it("formats absolute date at seven days", () => {
    expect(
      formatConversationTimestamp("2026-04-23T15:00:00.000Z", zone, now),
    ).toMatch(/23\/04\/2026/);
  });

  it("handles invalid and missing dates", () => {
    expect(formatConversationTimestamp(null, zone, now)).toBe("");
    expect(formatConversationTimestamp("not-a-date", zone, now)).toBe("");
  });

  it("handles UTC midnight near Sao Paulo day boundary", () => {
    const label = formatConversationTimestamp(
      "2026-04-30T02:30:00.000Z",
      zone,
      now,
    );
    expect(label).toBe("Ontem");
  });
});
