import type { ConversationListItem, Deal, Pipeline, PipelineStage } from "@/lib/types";

export type OperationFilter =
  | "all"
  | "unread"
  | "awaiting"
  | "no-conversation";

export type OperationView = "kanban" | "conversations";

export function parseOperationView(value: string | null | undefined): OperationView {
  if (value === "conversations") return "conversations";
  return "kanban";
}

/** Filters valid for Conversas view — drops no-conversation. */
export function normalizeFilterForView(
  filter: OperationFilter,
  view: OperationView,
): OperationFilter {
  if (view === "conversations" && filter === "no-conversation") return "all";
  return filter;
}

export function conversationFilterParams(filter: OperationFilter): {
  unreadOnly?: boolean;
  awaitingReply?: boolean;
} {
  if (filter === "unread") return { unreadOnly: true };
  if (filter === "awaiting") return { awaitingReply: true };
  return {};
}

export function chooseDefaultPipeline(
  pipelines: Array<Pick<Pipeline, "id" | "isDefault" | "archived" | "position" | "name">>,
  preferredId?: string | null,
): Pipeline | null {
  const active = pipelines.filter((pipeline) => !pipeline.archived);
  if (!active.length) return null;
  if (preferredId) {
    const preferred = active.find((pipeline) => pipeline.id === preferredId);
    if (preferred) return preferred as Pipeline;
  }
  const defaultPipeline = active.find((pipeline) => pipeline.isDefault);
  if (defaultPipeline) return defaultPipeline as Pipeline;
  return (
    ([...active].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0) || a.name.localeCompare(b.name),
    )[0] as Pipeline) ?? null
  );
}

export function dealMatchesOperationFilter(
  deal: Deal,
  filter: OperationFilter,
): boolean {
  switch (filter) {
    case "unread":
      return (deal.unreadCount ?? 0) > 0;
    case "awaiting":
      return Boolean(deal.awaitingReply);
    case "no-conversation":
      return !deal.conversationId;
    case "all":
    default:
      return true;
  }
}

export function dealMatchesSearch(deal: Deal, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    deal.contact?.name,
    deal.name,
    deal.contact?.phone,
    deal.contact?.whatsapp,
    deal.lastMessagePreview,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function filterPipelineBoard(
  pipeline: Pipeline,
  opts: { search?: string; filter?: OperationFilter; stageId?: string | null },
): Pipeline {
  const filter = opts.filter ?? "all";
  const search = opts.search ?? "";
  return {
    ...pipeline,
    stages: (pipeline.stages ?? []).map((stage) => ({
      ...stage,
      deals: (stage.deals ?? []).filter((deal) => {
        if (opts.stageId && stage.id !== opts.stageId) return false;
        return (
          dealMatchesOperationFilter(deal, filter) &&
          dealMatchesSearch(deal, search)
        );
      }),
    })),
  };
}

export function countBoardDeals(pipeline: Pipeline | undefined | null): number {
  if (!pipeline?.stages) return 0;
  return pipeline.stages.reduce(
    (sum, stage) => sum + (stage.deals?.length ?? 0),
    0,
  );
}

export function countBoardUnread(pipeline: Pipeline | undefined | null): number {
  if (!pipeline?.stages) return 0;
  return pipeline.stages.reduce(
    (sum, stage) =>
      sum +
      (stage.deals ?? []).reduce(
        (dealSum, deal) => dealSum + (deal.unreadCount ?? 0),
        0,
      ),
    0,
  );
}

export function findDealInBoard(
  pipeline: Pipeline | undefined | null,
  dealId: string,
): Deal | null {
  if (!pipeline?.stages) return null;
  for (const stage of pipeline.stages) {
    const deal = stage.deals?.find((item) => item.id === dealId);
    if (deal) return deal;
  }
  return null;
}

export function findDealByConversationId(
  pipeline: Pipeline | undefined | null,
  conversationId: string,
): Deal | null {
  if (!pipeline?.stages) return null;
  for (const stage of pipeline.stages) {
    const deal = stage.deals?.find(
      (item) => item.conversationId === conversationId,
    );
    if (deal) return deal;
  }
  return null;
}

/** Build a Deal card from conversation list metadata (includes closed/lost deals). */
export function dealFromConversationListItem(
  item: ConversationListItem,
  pipeline: Pipeline,
): Deal | null {
  const dealSummary = item.currentDeal;
  if (!dealSummary) return null;
  const contactName = item.contact?.name?.trim() || dealSummary.name;
  return {
    id: dealSummary.id,
    name: dealSummary.name || contactName,
    pipelineId: dealSummary.pipelineId || pipeline.id,
    stageId: dealSummary.stageId,
    conversationId: item.id,
    conversationStatus: item.status,
    unreadCount: item.unreadCount,
    lastMessagePreview: item.lastMessagePreview ?? null,
    lastMessageAt: item.lastMessageAt ?? null,
    createdAt: item.lastMessageAt ?? new Date(0).toISOString(),
    contact: item.contact
      ? {
          id: item.contact.id,
          name: contactName,
          firstName: item.contact.firstName,
          lastName: item.contact.lastName ?? null,
          createdAt: item.lastMessageAt ?? new Date(0).toISOString(),
        }
      : null,
  };
}

export function patchDealInStages(
  stages: PipelineStage[],
  dealId: string,
  patch: Partial<Deal>,
): PipelineStage[] {
  return stages.map((stage) => ({
    ...stage,
    deals: (stage.deals ?? []).map((deal) =>
      deal.id === dealId ? { ...deal, ...patch } : deal,
    ),
  }));
}

export function moveDealInStages(
  stages: PipelineStage[],
  dealId: string,
  toStageId: string,
): PipelineStage[] {
  let moving: Deal | null = null;
  const without = stages.map((stage) => {
    const deals = stage.deals ?? [];
    const found = deals.find((deal) => deal.id === dealId);
    if (found) moving = found;
    return {
      ...stage,
      deals: deals.filter((deal) => deal.id !== dealId),
    };
  });
  if (!moving) return stages;
  return without.map((stage) =>
    stage.id === toStageId
      ? {
          ...stage,
          deals: [...(stage.deals ?? []), { ...moving!, stageId: toStageId }],
        }
      : stage,
  );
}

export function channelLabel(deal: Deal): string | null {
  const channel = deal.channel;
  if (!channel) return null;
  if (channel.type === "WHATSAPP") return "WhatsApp";
  return channel.displayName || channel.name || channel.type;
}

export const STAGE_COLOR_PRESETS = [
  "#94A3B8",
  "#60A5FA",
  "#4ADE80",
  "#FBBF24",
  "#F97316",
  "#F87171",
  "#C084FC",
  "#2DD4BF",
] as const;

export function sanitizeStageName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function isValidStageName(name: string, maxLength = 80): boolean {
  const cleaned = sanitizeStageName(name);
  return cleaned.length > 0 && cleaned.length <= maxLength;
}
