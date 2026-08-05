import {
  buildBoardConversationSummary,
  normalizeBoardDealCard,
  selectRelevantConversation,
} from "./board-deal.mapper";

describe("board-deal.mapper", () => {
  it("prefers OPEN conversation then most recent lastMessageAt", () => {
    const selected = selectRelevantConversation([
      {
        id: "c-closed",
        status: "CLOSED",
        lastMessageAt: "2026-07-29T12:00:00.000Z",
      },
      {
        id: "c-open-old",
        status: "OPEN",
        lastMessageAt: "2026-07-28T12:00:00.000Z",
      },
      {
        id: "c-open-new",
        status: "OPEN",
        lastMessageAt: "2026-07-30T12:00:00.000Z",
      },
    ]);
    expect(selected?.id).toBe("c-open-new");
  });

  it("returns null when deal has no conversations", () => {
    expect(selectRelevantConversation([])).toBeNull();
    const summary = buildBoardConversationSummary(null);
    expect(summary.conversationId).toBeNull();
    expect(summary.awaitingReply).toBe(false);
  });

  it("marks awaitingReply when last message is inbound on OPEN conversation", () => {
    const summary = buildBoardConversationSummary(
      { id: "c1", status: "OPEN", unreadCount: 2 },
      {
        conversationId: "c1",
        body: "Qual o prazo?",
        sentAt: "2026-07-30T10:00:00.000Z",
        direction: "INBOUND",
      },
    );
    expect(summary.awaitingReply).toBe(true);
    expect(summary.lastMessagePreview).toBe("Qual o prazo?");
  });

  it("normalizes board card payload without inventing a conversation", () => {
    const card = normalizeBoardDealCard({
      dealId: "deal-1",
      name: "Lead Cláudia",
      value: 1200,
      pipelineId: "pipe-1",
      stageId: "stage-1",
      contactId: "ct-1",
      contactName: "Cláudia Nunes",
      phone: "+5565988667788",
      unreadMessages: 0,
    });
    expect(card.conversationId).toBeNull();
    expect(card.lastMessagePreview).toBeNull();
    expect(card.awaitingReply).toBe(false);
    expect(card.contactName).toBe("Cláudia Nunes");
  });

  it("uses deal conversation relation when present", () => {
    const card = normalizeBoardDealCard({
      dealId: "deal-2",
      name: "Lead Amanda",
      value: 1890,
      pipelineId: "pipe-novos",
      stageId: "st-1",
      contactName: "Amanda Vieira",
      unreadMessages: 2,
      conversation: {
        id: "conv-01",
        status: "OPEN",
        lastMessageAt: "2026-07-30T11:00:00.000Z",
        unreadCount: 2,
        channel: {
          id: "ch-whatsapp",
          type: "WHATSAPP",
          name: "WhatsApp Xingyu",
          displayName: "WhatsApp",
        },
      },
      latestMessage: {
        conversationId: "conv-01",
        body: "Gostaria de saber o prazo",
        sentAt: "2026-07-30T11:00:00.000Z",
        direction: "INBOUND",
      },
    });
    expect(card.conversationId).toBe("conv-01");
    expect(card.channel?.type).toBe("WHATSAPP");
    expect(card.lastMessagePreview).toBe("Gostaria de saber o prazo");
    expect(card.awaitingReply).toBe(true);
    expect(card.unreadCount).toBe(2);
  });
});
