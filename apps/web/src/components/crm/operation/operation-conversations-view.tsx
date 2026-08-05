"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import { conversationsApi } from "@/lib/api";
import { normalizeConversationListItems } from "@/lib/inbox-utils";
import { queryKeys } from "@/lib/query-keys";
import type { ConversationListItem, Deal, Pipeline } from "@/lib/types";
import {
  conversationFilterParams,
  dealFromConversationListItem,
  findDealByConversationId,
  type OperationFilter,
} from "@/lib/operation-utils";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { ConversationList } from "@/components/crm/conversation/conversation-list";
import { DealConversationPanel } from "./deal-conversation-panel";

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });
  React.useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function OperationConversationsView({
  pipeline,
  board,
  conversationId,
  search,
  filter,
  onSelectConversation,
  onCloseConversation,
  onStageChange,
  onInvalidConversation,
}: {
  pipeline: Pipeline;
  board: Pipeline | null | undefined;
  conversationId?: string | null;
  search: string;
  filter: OperationFilter;
  onSelectConversation: (conversationId: string) => void;
  onCloseConversation: () => void;
  onStageChange: (deal: Deal, stageId: string) => void;
  onInvalidConversation?: (conversationId: string) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const filterParams = conversationFilterParams(filter);

  const awaitingByConversationId = React.useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const stage of board?.stages ?? []) {
      for (const deal of stage.deals ?? []) {
        if (deal.conversationId && deal.awaitingReply) {
          map[deal.conversationId] = true;
        }
      }
    }
    return map;
  }, [board]);

  const bootstrapParams = React.useMemo(() => {
    const params: Record<string, string | number | boolean> = {
      pageSize: 30,
      pipelineId: pipeline.id,
    };
    if (search.trim()) params.search = search.trim();
    if (filterParams.unreadOnly) params.unreadOnly = true;
    if (filterParams.awaitingReply) params.awaitingReply = true;
    return params;
  }, [filterParams.awaitingReply, filterParams.unreadOnly, pipeline.id, search]);

  const bootstrapQuery = useQuery({
    queryKey: [...queryKeys.conversations.lists, "operation-bootstrap", bootstrapParams] as const,
    queryFn: async () => {
      const response = await conversationsApi.list(bootstrapParams);
      return normalizeConversationListItems(response);
    },
    staleTime: 30_000,
    retry: false,
  });

  const unfilteredBootstrapQuery = useQuery({
    queryKey: [
      ...queryKeys.conversations.lists,
      "operation-bootstrap-all",
      { pipelineId: pipeline.id, pageSize: 50 },
    ] as const,
    queryFn: async () => {
      const response = await conversationsApi.list({
        pipelineId: pipeline.id,
        pageSize: 50,
      });
      return normalizeConversationListItems(response);
    },
    staleTime: 30_000,
    retry: false,
  });

  React.useEffect(() => {
    if (conversationId) return;
    if (isMobile || isTablet) return;
    const first = bootstrapQuery.data?.[0];
    if (first) onSelectConversation(first.id);
  }, [
    bootstrapQuery.data,
    conversationId,
    isMobile,
    isTablet,
    onSelectConversation,
  ]);

  const linkedDeal = React.useMemo(() => {
    if (!conversationId || !board) return null;
    return findDealByConversationId(board, conversationId);
  }, [board, conversationId]);

  const listItemDeal = React.useMemo(() => {
    if (!conversationId || linkedDeal) return null;
    const pools: ConversationListItem[] = [
      ...(bootstrapQuery.data ?? []),
      ...(unfilteredBootstrapQuery.data ?? []),
    ];
    const item = pools.find((entry) => entry.id === conversationId);
    if (!item) return null;
    return dealFromConversationListItem(item, board ?? pipeline);
  }, [
    board,
    bootstrapQuery.data,
    conversationId,
    linkedDeal,
    pipeline,
    unfilteredBootstrapQuery.data,
  ]);

  const panelDeal = linkedDeal ?? listItemDeal;

  React.useEffect(() => {
    if (!conversationId || !onInvalidConversation) return;
    if (bootstrapQuery.isLoading || unfilteredBootstrapQuery.isLoading) return;
    if (panelDeal) return;
    const known = (unfilteredBootstrapQuery.data ?? []).some(
      (entry) => entry.id === conversationId,
    );
    if (known) return;
    onInvalidConversation(conversationId);
  }, [
    bootstrapQuery.isLoading,
    conversationId,
    onInvalidConversation,
    panelDeal,
    unfilteredBootstrapQuery.data,
    unfilteredBootstrapQuery.isLoading,
  ]);

  const showThread = Boolean(conversationId && panelDeal);
  const showList = !isMobile || !showThread;
  const showFullThread = Boolean(showThread && (isMobile || isTablet));

  return (
    <div
      className="relative flex h-full min-h-0 overflow-hidden"
      data-testid="operation-conversations-view"
    >
      <aside
        className={cn(
          "flex min-h-0 shrink-0 flex-col border-r border-border bg-background",
          showFullThread && "hidden",
          !showList && "hidden",
          "w-full md:w-[min(320px,36vw)] lg:w-[clamp(340px,28vw,380px)]",
        )}
        data-testid="operation-conversation-list"
      >
        <ConversationList
          scope={{ type: "pipeline", pipelineId: pipeline.id }}
          activeId={conversationId ?? undefined}
          basePath="/operacao"
          mounted={mounted}
          hideInternalFilters
          externalSearch={search}
          externalUnreadOnly={filterParams.unreadOnly}
          externalAwaitingReply={filterParams.awaitingReply}
          variant="operation"
          awaitingByConversationId={awaitingByConversationId}
          onSelectConversation={onSelectConversation}
          emptyTitle="Nenhuma conversa neste pipeline"
          emptyDescription="As conversas aparecerão aqui quando os clientes entrarem pelos canais conectados."
        />
      </aside>

      <div
        className={cn(
          "min-h-0 min-w-0 flex-1 bg-background",
          showFullThread && "absolute inset-0 z-30",
          !showThread && (isMobile || isTablet) && "hidden",
        )}
        data-testid="operation-conversation-pane"
      >
        {showThread && panelDeal ? (
          <DealConversationPanel
            deal={panelDeal}
            pipeline={board ?? pipeline}
            onClose={onCloseConversation}
            onStageChange={(stageId) => onStageChange(panelDeal, stageId)}
            mobile={isMobile || isTablet}
            backLabel="Voltar às conversas"
            historyOnly
          />
        ) : (
          <EmptyState
            icon={MessageCircle}
            title="Selecione uma conversa"
            description="Escolha um cliente na lista para abrir o histórico."
            className="m-auto border-0"
          />
        )}
      </div>
    </div>
  );
}
