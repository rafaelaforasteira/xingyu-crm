export type ConversationReplyFilter = "any" | "mine" | "customer";
export type ConversationStateFilter = "all" | "open" | "closed";
export type ConversationPeriodFilter =
  | "any"
  | "today"
  | "7d"
  | "30d"
  | "older30";

export interface ConversationAppliedFilters {
  channelIds: string[];
  unreadOnly: boolean;
  reply: ConversationReplyFilter;
  conversationState: ConversationStateFilter;
  stageIds: string[];
  tagIds: string[];
  period: ConversationPeriodFilter;
}

export const EMPTY_CONVERSATION_FILTERS: ConversationAppliedFilters = {
  channelIds: [],
  unreadOnly: false,
  reply: "any",
  conversationState: "all",
  stageIds: [],
  tagIds: [],
  period: "any",
};

export function cloneConversationFilters(
  filters: ConversationAppliedFilters,
): ConversationAppliedFilters {
  return {
    channelIds: [...filters.channelIds],
    unreadOnly: filters.unreadOnly,
    reply: filters.reply,
    conversationState: filters.conversationState,
    stageIds: [...filters.stageIds],
    tagIds: [...filters.tagIds],
    period: filters.period,
  };
}

export function conversationFiltersEqual(
  left: ConversationAppliedFilters,
  right: ConversationAppliedFilters,
): boolean {
  return (
    left.unreadOnly === right.unreadOnly &&
    left.reply === right.reply &&
    left.conversationState === right.conversationState &&
    left.period === right.period &&
    sameIdSet(left.channelIds, right.channelIds) &&
    sameIdSet(left.stageIds, right.stageIds) &&
    sameIdSet(left.tagIds, right.tagIds)
  );
}

function sameIdSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const set = new Set(left);
  return right.every((id) => set.has(id));
}

/** Count active filter GROUPS (not individual options). */
export function countActiveConversationFilterGroups(
  filters: ConversationAppliedFilters,
  options?: { availableChannelIds?: string[] },
): number {
  let count = 0;
  const channels = uniqueIds(filters.channelIds);
  const available = options?.availableChannelIds
    ? new Set(options.availableChannelIds)
    : null;
  const effectiveChannels = available
    ? channels.filter((id) => available.has(id))
    : channels;
  const allChannelsSelected =
    available != null &&
    available.size > 0 &&
    effectiveChannels.length === available.size;

  if (effectiveChannels.length > 0 && !allChannelsSelected) count += 1;
  if (filters.unreadOnly) count += 1;
  if (filters.reply !== "any") count += 1;
  if (filters.conversationState !== "all") count += 1;
  if (uniqueIds(filters.stageIds).length > 0) count += 1;
  if (uniqueIds(filters.tagIds).length > 0) count += 1;
  if (filters.period !== "any") count += 1;
  return count;
}

export function formatFilterBadgeCount(count: number): string {
  if (count <= 0) return "";
  return count > 9 ? "9+" : String(count);
}

export function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function normalizeConversationFilters(
  filters: ConversationAppliedFilters,
  options?: {
    availableChannelIds?: string[];
    availableStageIds?: string[];
    availableTagIds?: string[];
  },
): ConversationAppliedFilters {
  let channelIds = uniqueIds(filters.channelIds);
  let stageIds = uniqueIds(filters.stageIds);
  let tagIds = uniqueIds(filters.tagIds);

  if (options?.availableChannelIds) {
    const allowed = new Set(options.availableChannelIds);
    channelIds = channelIds.filter((id) => allowed.has(id));
    if (
      options.availableChannelIds.length > 0 &&
      channelIds.length === options.availableChannelIds.length
    ) {
      channelIds = [];
    }
  }
  if (options?.availableStageIds) {
    const allowed = new Set(options.availableStageIds);
    stageIds = stageIds.filter((id) => allowed.has(id));
  }
  if (options?.availableTagIds) {
    const allowed = new Set(options.availableTagIds);
    tagIds = tagIds.filter((id) => allowed.has(id));
  }

  return {
    channelIds,
    unreadOnly: Boolean(filters.unreadOnly),
    reply: filters.reply ?? "any",
    conversationState: filters.conversationState ?? "all",
    stageIds,
    tagIds,
    period: filters.period ?? "any",
  };
}

const FILTER_PARAM_KEYS = [
  "channels",
  "unread",
  "reply",
  "conversationState",
  "stages",
  "tags",
  "period",
  // legacy aliases cleaned on apply
  "unreadOnly",
  "awaitingReply",
  "channelId",
] as const;

export function parseConversationFiltersFromSearchParams(
  params: URLSearchParams | { get: (key: string) => string | null },
): ConversationAppliedFilters {
  const get = (key: string) => params.get(key);

  const replyRaw = get("reply");
  const reply: ConversationReplyFilter =
    replyRaw === "mine" || replyRaw === "customer" ? replyRaw : "any";

  const stateRaw = get("conversationState");
  const conversationState: ConversationStateFilter =
    stateRaw === "open" || stateRaw === "closed" ? stateRaw : "all";

  const periodRaw = get("period");
  const period: ConversationPeriodFilter =
    periodRaw === "today" ||
    periodRaw === "7d" ||
    periodRaw === "30d" ||
    periodRaw === "older30"
      ? periodRaw
      : "any";

  const unread =
    get("unread") === "1" ||
    get("unread") === "true" ||
    get("unreadOnly") === "1" ||
    get("unreadOnly") === "true";

  // legacy single awaitingReply → mine
  const legacyAwaiting =
    get("awaitingReply") === "1" || get("awaitingReply") === "true";

  return normalizeConversationFilters({
    channelIds: splitCsv(get("channels") ?? get("channelId")),
    unreadOnly: unread,
    reply: reply === "any" && legacyAwaiting ? "mine" : reply,
    conversationState,
    stageIds: splitCsv(get("stages")),
    tagIds: splitCsv(get("tags")),
    period,
  });
}

export function applyConversationFiltersToSearchParams(
  params: URLSearchParams,
  filters: ConversationAppliedFilters,
): URLSearchParams {
  const next = new URLSearchParams(params.toString());
  for (const key of FILTER_PARAM_KEYS) next.delete(key);

  const normalized = normalizeConversationFilters(filters);
  if (normalized.channelIds.length) {
    next.set("channels", normalized.channelIds.join(","));
  }
  if (normalized.unreadOnly) next.set("unread", "1");
  if (normalized.reply !== "any") next.set("reply", normalized.reply);
  if (normalized.conversationState !== "all") {
    next.set("conversationState", normalized.conversationState);
  }
  if (normalized.stageIds.length) {
    next.set("stages", normalized.stageIds.join(","));
  }
  if (normalized.tagIds.length) {
    next.set("tags", normalized.tagIds.join(","));
  }
  if (normalized.period !== "any") next.set("period", normalized.period);
  return next;
}

export function conversationFiltersToApiQuery(
  filters: ConversationAppliedFilters,
): Record<string, string | boolean | undefined> {
  const normalized = normalizeConversationFilters(filters);
  return {
    channels:
      normalized.channelIds.length > 0
        ? normalized.channelIds.join(",")
        : undefined,
    stages:
      normalized.stageIds.length > 0
        ? normalized.stageIds.join(",")
        : undefined,
    tags:
      normalized.tagIds.length > 0 ? normalized.tagIds.join(",") : undefined,
    unreadOnly: normalized.unreadOnly ? true : undefined,
    replyStatus:
      normalized.reply === "any" ? undefined : normalized.reply,
    conversationState:
      normalized.conversationState === "all"
        ? undefined
        : normalized.conversationState,
    period: normalized.period === "any" ? undefined : normalized.period,
  };
}

function splitCsv(value: string | null | undefined): string[] {
  if (!value) return [];
  return uniqueIds(value.split(","));
}

export type ConversationSortInput = {
  id: string;
  status?: string | null;
  unreadCount?: number | null;
  lastMessageAt?: string | Date | null;
  updatedAt?: string | Date | null;
  lastMessageDirection?: string | null;
};

export function conversationPriorityGroup(
  item: ConversationSortInput,
): number {
  const status = (item.status ?? "").toUpperCase();
  const closed = status === "RESOLVED" || status === "ARCHIVED";
  if (closed) return 5;

  const direction = (item.lastMessageDirection ?? "").toUpperCase();
  const unread = (item.unreadCount ?? 0) > 0;
  if (direction === "INBOUND" && unread) return 1;
  if (direction === "INBOUND") return 2;
  if (direction === "OUTBOUND") return 3;
  return 4;
}

export function compareConversationsByPriority(
  left: ConversationSortInput,
  right: ConversationSortInput,
): number {
  const groupDelta =
    conversationPriorityGroup(left) - conversationPriorityGroup(right);
  if (groupDelta !== 0) return groupDelta;

  const leftTime = toTime(left.lastMessageAt);
  const rightTime = toTime(right.lastMessageAt);
  if (leftTime !== rightTime) return rightTime - leftTime;

  const leftUpdated = toTime(left.updatedAt);
  const rightUpdated = toTime(right.updatedAt);
  if (leftUpdated !== rightUpdated) return rightUpdated - leftUpdated;

  return left.id < right.id ? 1 : left.id > right.id ? -1 : 0;
}

function toTime(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}
