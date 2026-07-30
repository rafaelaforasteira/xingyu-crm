"use client";

import * as React from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
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
  visible,
  mounted,
}: {
  scope: { type: "global" } | { type: "pipeline"; pipelineId: string };
  activeId?: string;
  basePath: string;
  visible: boolean;
  mounted: boolean;
}) {
  const [filters, setFilters] = React.useState<ConversationFiltersState>({
    search: "",
    channelId: "",
    pipelineId: scope.type === "pipeline" ? scope.pipelineId : "",
    unreadOnly: false,
  });

  React.useEffect(() => {
    if (scope.type === "pipeline") {
      setFilters((current) => ({ ...current, pipelineId: scope.pipelineId }));
    }
  }, [scope]);

  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const listParams = React.useMemo(
    () => ({
      pageSize: 30,
      search: debouncedSearch || undefined,
      channelId: filters.channelId || undefined,
      pipelineId:
        scope.type === "pipeline"
          ? scope.pipelineId
          : filters.pipelineId || undefined,
      unreadOnly: filters.unreadOnly || undefined,
    }),
    [debouncedSearch, filters.channelId, filters.pipelineId, filters.unreadOnly, scope],
  );

  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.conversations.list(listParams),
    queryFn: async ({ pageParam }) => {
      const isCursor = typeof pageParam === "string";
      const response = await conversationsApi.list({
        ...listParams,
        ...(isCursor
          ? { cursor: pageParam }
          : { page: (pageParam as number | undefined) ?? 1 }),
      });
      return {
        data: normalizeConversationListItems(response),
        meta: response.meta,
      };
    },
    initialPageParam: 1 as number | string,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      const meta = lastPage.meta as {
        hasMore?: boolean;
        nextCursor?: string | null;
        page?: number;
        totalPages?: number;
      };
      if (meta.hasMore && meta.nextCursor) return meta.nextCursor;
      if (
        typeof lastPageParam === "number" &&
        meta.page &&
        meta.totalPages &&
        meta.page < meta.totalPages
      ) {
        return lastPageParam + 1;
      }
      return undefined;
    },
    retry: false,
  });

  const conversations = React.useMemo(
    () => listQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [listQuery.data],
  );

  const pipelinesQuery = useQuery({
    queryKey: queryKeys.pipelines.navigation,
    queryFn: () => pipelinesApi.navigation(),
    enabled: scope.type === "global",
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

  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !listQuery.hasNextPage || listQuery.isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void listQuery.fetchNextPage();
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [listQuery]);

  return (
    <section
      aria-label="Lista de conversas"
      className={visible ? "flex min-h-0 flex-col" : "hidden min-h-0 flex-col md:flex"}
    >
      <ConversationFilters
        filters={filters}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        showPipelineFilter={scope.type === "global"}
        channels={channels}
        pipelines={pipelines}
      />
      <div
        className="scrollbar-thin flex-1 overflow-y-auto"
        data-testid="conversation-list"
      >
        {listQuery.isLoading ? (
          <div className="space-y-2 p-3" aria-label="Carregando conversas">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-16 w-full" />
            ))}
          </div>
        ) : listQuery.error ? (
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
        {listQuery.hasNextPage ? (
          <div ref={loadMoreRef} className="flex justify-center p-3">
            {listQuery.isFetchingNextPage ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void listQuery.fetchNextPage()}
              >
                Carregar mais
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
