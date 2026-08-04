"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Inbox, Loader2 } from "lucide-react";
import { conversationsApi, pipelinesApi, settingsApi } from "@/lib/api";
import { normalizeConversationListItems } from "@/lib/inbox-utils";
import { queryKeys } from "@/lib/query-keys";
import type { ConversationListItem } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ConversationFilters,
  type ConversationFiltersState,
} from "./conversation-filters";
import { ConversationListItemRow } from "./conversation-list-item";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = globalThis.setTimeout(() => setDebounced(value), delayMs);
    return () => globalThis.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function ConversationList({
  scope,
  activeId,
  basePath,
  mounted,
}: {
  scope: { type: "global" } | { type: "pipeline"; pipelineId: string };
  activeId?: string;
  basePath: string;
  visible?: boolean;
  mounted: boolean;
}) {
  const searchParams = useSearchParams();
  const scopeType = scope.type;
  const scopePipelineId = scope.type === "pipeline" ? scope.pipelineId : undefined;

  const [filters, setFilters] = React.useState<ConversationFiltersState>({
    search: "",
    channelId: "",
    pipelineId: scopePipelineId ?? "",
    unreadOnly: searchParams.get("unreadOnly") === "1",
    awaitingReply: searchParams.get("awaitingReply") === "1",
  });
  const [page, setPage] = React.useState(1);
  const [accumulated, setAccumulated] = React.useState<ConversationListItem[]>(
    [],
  );

  React.useEffect(() => {
    const unreadOnly = searchParams.get("unreadOnly") === "1";
    const awaitingReply = searchParams.get("awaitingReply") === "1";
    setFilters((current) => ({
      ...current,
      unreadOnly: unreadOnly || current.unreadOnly,
      awaitingReply: awaitingReply || current.awaitingReply,
    }));
  }, [searchParams]);

  React.useEffect(() => {
    if (scopeType === "pipeline" && scopePipelineId) {
      setFilters((current) =>
        current.pipelineId === scopePipelineId
          ? current
          : { ...current, pipelineId: scopePipelineId },
      );
    }
  }, [scopePipelineId, scopeType]);

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const listParams = React.useMemo(() => {
    const params: Record<string, string | number | boolean> = {
      pageSize: 30,
      page,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filters.channelId) params.channelId = filters.channelId;
    if (scopeType === "pipeline" && scopePipelineId) {
      params.pipelineId = scopePipelineId;
    } else if (filters.pipelineId) {
      params.pipelineId = filters.pipelineId;
    }
    if (filters.unreadOnly) params.unreadOnly = true;
    if (filters.awaitingReply) params.awaitingReply = true;
    return params;
  }, [
    debouncedSearch,
    filters.channelId,
    filters.pipelineId,
    filters.unreadOnly,
    filters.awaitingReply,
    page,
    scopePipelineId,
    scopeType,
  ]);

  const filterKey = React.useMemo(
    () =>
      JSON.stringify({
        search: debouncedSearch || "",
        channelId: filters.channelId || "",
        pipelineId:
          scopeType === "pipeline"
            ? scopePipelineId || ""
            : filters.pipelineId || "",
        unreadOnly: Boolean(filters.unreadOnly),
        awaitingReply: Boolean(filters.awaitingReply),
        scopeType,
      }),
    [
      debouncedSearch,
      filters.channelId,
      filters.pipelineId,
      filters.unreadOnly,
      filters.awaitingReply,
      scopePipelineId,
      scopeType,
    ],
  );

  React.useEffect(() => {
    setPage(1);
    setAccumulated([]);
  }, [filterKey]);

  const listQuery = useQuery({
    queryKey: queryKeys.conversations.list(listParams),
    queryFn: async () => {
      const response = await conversationsApi.list(listParams);
      return {
        data: normalizeConversationListItems(response),
        meta: response.meta,
      };
    },
    retry: false,
    placeholderData: (previous) => previous,
  });

  React.useEffect(() => {
    if (!listQuery.data) return;
    setAccumulated((current) => {
      if (page <= 1) return listQuery.data.data;
      const seen = new Set(current.map((item) => item.id));
      const next = listQuery.data.data.filter((item) => !seen.has(item.id));
      return next.length ? [...current, ...next] : current;
    });
  }, [listQuery.data, page]);

  const conversations = accumulated;
  const meta = listQuery.data?.meta as
    | { page?: number; totalPages?: number; hasMore?: boolean }
    | undefined;
  const hasMore =
    Boolean(meta?.hasMore) ||
    (typeof meta?.page === "number" &&
      typeof meta?.totalPages === "number" &&
      meta.page < meta.totalPages);

  const pipelinesQuery = useQuery({
    queryKey: queryKeys.pipelines.navigation,
    queryFn: () => pipelinesApi.navigation(),
    enabled: scopeType === "global",
    staleTime: 60_000,
  });

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.overview(),
    staleTime: 60_000,
  });

  const channels = settingsQuery.data?.channels ?? [];
  const pipelines =
    pipelinesQuery.data?.map((item) => ({ id: item.id, name: item.name })) ?? [];

  const showInitialLoading = listQuery.isPending && conversations.length === 0;

  return (
    <section
      aria-label="Lista de conversas"
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <ConversationFilters
        filters={filters}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        showPipelineFilter={scopeType === "global"}
        channels={channels}
        pipelines={pipelines}
      />
      <div
        className="scrollbar-thin min-h-[12rem] flex-1 overflow-y-auto"
        data-testid="conversation-list"
      >
        {showInitialLoading ? (
          <div className="space-y-2 p-3" aria-label="Carregando conversas">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-16 w-full" />
            ))}
          </div>
        ) : listQuery.error && conversations.length === 0 ? (
          <div className="p-3 text-sm text-destructive">
            {(listQuery.error as Error).message}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nenhuma conversa"
            description="Ajuste os filtros ou aguarde novos leads."
            className="m-3 border-0"
          />
        ) : (
          conversations.map((conversation: ConversationListItem) => (
            <ConversationListItemRow
              key={conversation.id}
              conversation={conversation}
              href={`${basePath}/${conversation.id}`}
              active={activeId === conversation.id}
              mounted={mounted}
            />
          ))
        )}
        {hasMore ? (
          <div className="flex justify-center p-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={listQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
            >
              {listQuery.isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Carregar mais
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
