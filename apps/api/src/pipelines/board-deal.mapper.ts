export type BoardConversationCandidate = {
  id: string;
  status: string;
  lastMessageAt?: Date | string | null;
  unreadCount?: number;
  channelId?: string | null;
  channel?: {
    id: string;
    type: string;
    name: string;
    displayName?: string | null;
    provider?: string | null;
  } | null;
};

export type BoardLatestMessage = {
  conversationId: string;
  body: string | null;
  sentAt: Date | string;
  direction: "INBOUND" | "OUTBOUND" | string;
};

/**
 * Prefer OPEN conversations, then most recent lastMessageAt.
 * Deal.conversationId is 1:1 today; this keeps selection rules explicit for tests.
 */
export function selectRelevantConversation(
  conversations: BoardConversationCandidate[],
): BoardConversationCandidate | null {
  if (!conversations.length) return null;
  return conversations.slice().sort((a, b) => {
    const openScore = (status: string) => (status === "OPEN" ? 1 : 0);
    const openDiff = openScore(b.status) - openScore(a.status);
    if (openDiff !== 0) return openDiff;
    const aAt = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bAt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bAt - aAt;
  })[0];
}

export function buildBoardConversationSummary(
  conversation: BoardConversationCandidate | null | undefined,
  latest?: BoardLatestMessage | null,
) {
  if (!conversation) {
    return {
      conversationId: null as string | null,
      conversationStatus: null as string | null,
      channel: null as BoardConversationCandidate["channel"],
      lastMessagePreview: null as string | null,
      lastMessageAt: null as string | null,
      awaitingReply: false,
      conversationUnreadCount: 0,
    };
  }

  const preview = latest?.body?.trim() || (latest ? "Anexo" : null);
  const lastMessageAt = latest?.sentAt
    ? new Date(latest.sentAt).toISOString()
    : conversation.lastMessageAt
      ? new Date(conversation.lastMessageAt).toISOString()
      : null;
  const awaitingReply =
    conversation.status === "OPEN" && latest?.direction === "INBOUND";

  return {
    conversationId: conversation.id,
    conversationStatus: conversation.status,
    channel: conversation.channel ?? null,
    lastMessagePreview: preview,
    lastMessageAt,
    awaitingReply,
    conversationUnreadCount: conversation.unreadCount ?? 0,
  };
}

export function normalizeBoardDealCard(input: {
  dealId: string;
  name: string;
  value: number;
  currency?: string;
  pipelineId: string;
  stageId: string;
  contactId?: string | null;
  contactName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  owner?: { id: string; name: string; avatarUrl?: string | null } | null;
  unreadMessages?: number;
  conversation?: BoardConversationCandidate | null;
  conversations?: BoardConversationCandidate[];
  latestMessage?: BoardLatestMessage | null;
}) {
  const conversation =
    input.conversation ??
    selectRelevantConversation(input.conversations ?? []);
  const latestForDeal =
    input.latestMessage &&
    conversation &&
    input.latestMessage.conversationId === conversation.id
      ? input.latestMessage
      : null;
  const resolved = buildBoardConversationSummary(conversation, latestForDeal);

  return {
    dealId: input.dealId,
    contactId: input.contactId ?? null,
    contactName: input.contactName ?? null,
    phone: input.phone ?? input.whatsapp ?? null,
    whatsapp: input.whatsapp ?? null,
    conversationId: resolved.conversationId,
    conversationStatus: resolved.conversationStatus,
    channel: resolved.channel,
    lastMessagePreview: resolved.lastMessagePreview,
    lastMessageAt: resolved.lastMessageAt,
    unreadCount: input.unreadMessages ?? resolved.conversationUnreadCount,
    awaitingReply: resolved.awaitingReply,
    pipelineId: input.pipelineId,
    stageId: input.stageId,
    owner: input.owner ?? null,
    value: input.value,
    currency: input.currency ?? "BRL",
    name: input.name,
  };
}
