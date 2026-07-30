import { fullName } from "./names";
import { flattenTags, type TagJunction, type TagRef } from "./tags";

export type ChannelSummaryInput = {
  id: string;
  type: string;
  name: string;
  displayName?: string | null;
  provider?: string | null;
  externalAccountId?: string | null;
  status?: string | null;
};

export type ContactSummaryInput = {
  id: string;
  firstName: string;
  lastName?: string | null;
  tags?: TagJunction[] | null;
};

export type DealSummaryInput = {
  id: string;
  name: string;
  pipelineId: string;
  stageId: string;
  priority?: string;
  stage?: { name: string } | null;
  tags?: TagJunction[] | null;
};

export type ConversationListInput = {
  id: string;
  status: string;
  lastMessageAt?: Date | string | null;
  unreadCount: number;
  contact?: ContactSummaryInput | null;
  assignee?: { id: string; name: string; avatarUrl?: string | null } | null;
  channel?: ChannelSummaryInput | null;
  deal?: DealSummaryInput | null;
  lastMessagePreview?: string | null;
};

export function toChannelSummary(
  channel: ChannelSummaryInput | null | undefined,
) {
  if (!channel) return null;
  return {
    id: channel.id,
    type: channel.type,
    name: channel.name,
    displayName: channel.displayName ?? channel.name,
    provider: channel.provider ?? null,
    externalAccountId: channel.externalAccountId ?? null,
    status: channel.status ?? null,
  };
}

export function toContactSummary(contact: ContactSummaryInput | null | undefined) {
  if (!contact) return null;
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName ?? null,
    name: fullName(contact.firstName, contact.lastName),
  };
}

export function toCurrentDealSummary(deal: DealSummaryInput | null | undefined) {
  if (!deal) return null;
  return {
    id: deal.id,
    name: deal.name,
    pipelineId: deal.pipelineId,
    stageId: deal.stageId,
    stageName: deal.stage?.name ?? null,
    priority: deal.priority ?? null,
  };
}

export function mergeConversationTags(
  contact?: { tags?: TagJunction[] | null } | null,
  deal?: { tags?: TagJunction[] | null } | null,
): TagRef[] {
  const seen = new Set<string>();
  const merged: TagRef[] = [];
  for (const tag of [...flattenTags(contact?.tags), ...flattenTags(deal?.tags)]) {
    if (seen.has(tag.id)) continue;
    seen.add(tag.id);
    merged.push(tag);
  }
  return merged;
}

export function toConversationListItem(conversation: ConversationListInput) {
  return {
    id: conversation.id,
    status: conversation.status,
    lastMessageAt: conversation.lastMessageAt ?? null,
    unreadCount: conversation.unreadCount,
    lastMessagePreview: conversation.lastMessagePreview ?? null,
    contact: toContactSummary(conversation.contact),
    assignee: conversation.assignee ?? null,
    channel: toChannelSummary(conversation.channel),
    currentDeal: toCurrentDealSummary(conversation.deal),
    tags: mergeConversationTags(conversation.contact, conversation.deal),
  };
}
