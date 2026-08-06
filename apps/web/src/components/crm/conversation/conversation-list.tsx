"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Inbox, Loader2 } from "lucide-react";
import { conversationsApi } from "@/lib/api";
import { normalizeConversationListItems } from "@/lib/inbox-utils";
import { queryKeys } from "@/lib/query-keys";
import type { ConversationListItem } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConversationFiltersPopover } from "./conversation-filters-popover";
import { ConversationListItemRow } from "./conversation-list-item";
import {
  EMPTY_CONVERSATION_FILTERS,
  applyConversationFiltersToSearchParams,
  conversationFiltersEqual,
  conversationFiltersToApiQuery,
  parseConversationFiltersFromSearchParams,
  type ConversationAppliedFilters,
} from "./conversation-filter-utils";

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
  getConversationHref,
  mounted,
  externalSearch,
  onExternalSearchChange,
  externalUnreadOnly,
  externalAwaitingReply,
  hideInternalFilters = false,
  variant = "default",
  awaitingByConversationId,
  onSelectConversation,
  emptyTitle,
  emptyDescription,
  className,
}: {
  scope: { type: "global" } | { type: "pipeline"; pipelineId: string };
  activeId?: string;
  basePath: string;
  getConversationHref?: (conversationId: string) => string;
  visible?: boolean;
  mounted: boolean;
  /** Controlled search from parent (e.g. Operação header). */
  externalSearch?: string;
  /** Sync list search back to parent / URL `q`. */
  onExternalSearchChange?: (search: string) => void;
  externalUnreadOnly?: boolean;
  externalAwaitingReply?: boolean;
  hideInternalFilters?: boolean;
  variant?: "default" | "operation";
  awaitingByConversationId?: Record<string, boolean>;
  onSelectConversation?: (conversationId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopeType = scope.type;
  const scopePipelineId = scope.type === "pipeline" ? scope.pipelineId : undefined;
  const controlled = hideInternalFilters;
  const searchSynced = externalSearch !== undefined;

  const appliedFilters = React.useMemo(
    () =>
      controlled
        ? {
            ...EMPTY_CONVERSATION_FILTERS,
            unreadOnly: Boolean(externalUnreadOnly),
            reply: externalAwaitingReply
              ? ("mine" as const)
              : ("any" as const),
          }
        : parseConversationFiltersFromSearchParams(searchParams),
    [
      controlled,
      externalAwaitingReply,
      externalUnreadOnly,
      searchParams,
    ],
  );

  const [search, setSearch] = React.useState(
    () => externalSearch ?? searchParams.get("q") ?? "",
  );
  const [page, setPage] = React.useState(1);
  const [accumulated, setAccumulated] = React.useState<ConversationListItem[]>(
    [],
  );

  React.useEffect(() => {
    if (!searchSynced) return;
    setSearch((current) =>
      current === (externalSearch ?? "") ? current : (externalSearch ?? ""),
    );
  }, [externalSearch, searchSynced]);

  const onSearchChange = React.useCallback(
    (value: string) => {
      setSearch(value);
      onExternalSearchChange?.(value);
    },
    [onExternalSearchChange],
  );

  const debouncedSearch = useDebouncedValue(search, controlled ? 0 : 300);

  const writeFiltersToUrl = React.useCallback(
    (filters: ConversationAppliedFilters) => {
      const params = applyConversationFiltersToSearchParams(
        new URLSearchParams(searchParams.toString()),
        filters,
      );
      if (!params.get("view") && basePath.includes("operacao")) {
        params.set("view", "conversations");
      }
      const query = params.toString();
      const path = basePath.includes("?")
        ? basePath
        : `${basePath.startsWith("/") ? basePath : `/${basePath}`}`;
      const href = path.includes("/operacao")
        ? `/operacao?${query}`
        : query
          ? `${path}?${query}`
          : path;
      router.replace(href, { scroll: false });
    },
    [basePath, router, searchParams],
  );

  const onApplyFilters = React.useCallback(
    (filters: ConversationAppliedFilters) => {
      writeFiltersToUrl(filters);
    },
    [writeFiltersToUrl],
  );

  const onClearFilters = React.useCallback(() => {
    writeFiltersToUrl(EMPTY_CONVERSATION_FILTERS);
  }, [writeFiltersToUrl]);

  const listParams = React.useMemo(() => {
    const params: Record<string, string | number | boolean> = {
      pageSize: 30,
      page,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (scopeType === "pipeline" && scopePipelineId) {
      params.pipelineId = scopePipelineId;
    }

    if (controlled) {
      if (externalUnreadOnly) params.unreadOnly = true;
      if (externalAwaitingReply) params.awaitingReply = true;
      return params;
    }

    const apiFilters = conversationFiltersToApiQuery(appliedFilters);
    for (const [key, value] of Object.entries(apiFilters)) {
      if (value !== undefined) params[key] = value;
    }
    return params;
  }, [
    appliedFilters,
    controlled,
    debouncedSearch,
    externalAwaitingReply,
    externalUnreadOnly,
    page,
    scopePipelineId,
    scopeType,
  ]);

  const filterKey = React.useMemo(
    () => JSON.stringify(listParams),
    [listParams],
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

  const showInitialLoading = listQuery.isPending && conversations.length === 0;
  const hasActiveFilters =
    !controlled &&
    !conversationFiltersEqual(appliedFilters, EMPTY_CONVERSATION_FILTERS);

  return (
    <section
      aria-label="Lista de conversas"
      className={`flex h-full min-h-0 flex-1 flex-col ${className ?? ""}`}
      data-testid="conversation-list-panel"
    >
      {controlled ? null : (
        <div
          className="flex items-center gap-2 border-b border-border p-2"
          data-testid="conversation-list-toolbar"
        >
          <Input
            aria-label="Filtrar conversas"
            placeholder="Buscar conversas…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="h-9 min-w-0 flex-1"
          />
          <ConversationFiltersPopover
            pipelineId={scopePipelineId}
            applied={appliedFilters}
            onApply={onApplyFilters}
            onClear={onClearFilters}
          />
        </div>
      )}
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
          <div className="space-y-2 p-3 text-sm">
            <p className="text-destructive">
              {(listQuery.error as Error).message}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void listQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={
              emptyTitle ??
              (hasActiveFilters || debouncedSearch
                ? "Nenhuma conversa encontrada com estes filtros."
                : "Nenhuma conversa")
            }
            description={
              emptyDescription ??
              (hasActiveFilters
                ? "Ajuste ou limpe os filtros para ver mais conversas."
                : "Ajuste os filtros ou aguarde novos leads.")
            }
            actionLabel={hasActiveFilters ? "Limpar filtros" : undefined}
            onAction={hasActiveFilters ? onClearFilters : undefined}
            className="m-3 border-0"
          />
        ) : (
          conversations.map((conversation: ConversationListItem) => (
            <ConversationListItemRow
              key={conversation.id}
              conversation={conversation}
              href={
                getConversationHref
                  ? getConversationHref(conversation.id)
                  : `${basePath}/${conversation.id}`
              }
              active={activeId === conversation.id}
              mounted={mounted}
              variant={variant}
              awaitingReply={awaitingByConversationId?.[conversation.id]}
              onSelect={onSelectConversation}
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
