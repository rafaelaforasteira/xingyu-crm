"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "@/lib/api";
import { normalizeConversationListItems } from "@/lib/inbox-utils";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { ConversationList } from "./conversation-list";
import { ConversationThread } from "./conversation-thread";
import { LeadContextPanel } from "./lead-context-panel";

export type ConversationWorkspaceScope =
  | { type: "global" }
  | { type: "pipeline"; pipelineId: string };

type MobileView = "list" | "thread" | "panel";

export function ConversationWorkspace({
  scope,
  conversationId,
  basePath,
  header,
  className,
  getConversationHref,
  clearHref,
  onSelectConversation,
  workspaceTestId = "conversation-workspace",
  externalSearch,
  onExternalSearchChange,
}: {
  scope: ConversationWorkspaceScope;
  conversationId?: string;
  basePath: string;
  header?: React.ReactNode;
  className?: string;
  /** Override path-style hrefs (e.g. /operacao?view=conversations&conversation=id). */
  getConversationHref?: (conversationId: string) => string;
  /** Href used when clearing the active conversation (mobile back). */
  clearHref?: string;
  onSelectConversation?: (conversationId: string) => void;
  workspaceTestId?: string;
  /** Shared search with the beta header (`q`). */
  externalSearch?: string;
  onExternalSearchChange?: (search: string) => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [mobileView, setMobileView] = React.useState<MobileView>("list");
  const [panelDrawerOpen, setPanelDrawerOpen] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (conversationId) {
      setMobileView("thread");
    } else {
      setMobileView("list");
    }
    setPanelDrawerOpen(false);
  }, [conversationId]);

  const scopeType = scope.type;
  const scopePipelineId = scope.type === "pipeline" ? scope.pipelineId : undefined;

  const listParams = React.useMemo(() => {
    const params: Record<string, string | number> = { pageSize: 30 };
    if (scopeType === "pipeline" && scopePipelineId) {
      params.pipelineId = scopePipelineId;
    }
    return params;
  }, [scopePipelineId, scopeType]);

  const bootstrapListQuery = useQuery({
    queryKey: [...queryKeys.conversations.lists, "bootstrap", listParams] as const,
    queryFn: async () => {
      const response = await conversationsApi.list(listParams);
      return normalizeConversationListItems(response);
    },
    retry: false,
    staleTime: 30_000,
  });

  const resolveHref = React.useCallback(
    (id: string) =>
      getConversationHref
        ? getConversationHref(id)
        : `${basePath}/${encodeURIComponent(id)}`,
    [basePath, getConversationHref],
  );

  const listBaseHref = clearHref ?? basePath;

  React.useEffect(() => {
    const first = bootstrapListQuery.data?.[0];
    if (!conversationId && first) {
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 767px)").matches
      ) {
        return;
      }
      router.replace(resolveHref(first.id));
    }
  }, [bootstrapListQuery.data, conversationId, resolveHref, router]);

  const detailQuery = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId ?? ""),
    queryFn: () => conversationsApi.get(conversationId!),
    enabled: Boolean(conversationId),
    retry: false,
  });

  const listQueryKey = queryKeys.conversations.list(listParams);

  return (
    <div
      className={cn(
        "mx-auto flex h-[calc(100dvh-7.5rem)] min-h-[34rem] w-full max-w-[1480px] flex-col",
        className,
      )}
      data-testid={workspaceTestId}
    >
      {header}
      <div
        className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-card md:grid-cols-[280px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)_300px]"
        data-testid="beta-conversation-columns"
      >
        <div
          className={cn(
            "min-h-0 border-border md:border-r md:flex md:flex-col",
            conversationId && mobileView !== "list" ? "hidden md:flex" : "flex flex-col",
          )}
          data-testid="beta-conversation-list"
        >
          <ConversationList
            scope={scope}
            activeId={conversationId}
            basePath={basePath}
            getConversationHref={getConversationHref}
            mounted={mounted}
            onSelectConversation={onSelectConversation}
            externalSearch={externalSearch}
            onExternalSearchChange={onExternalSearchChange}
          />
        </div>

        <div
          className="flex min-h-0 min-w-0 justify-center bg-muted/20"
          data-testid="beta-conversation-thread"
        >
          <ConversationThread
            conversationId={conversationId}
            detail={detailQuery.data}
            detailLoading={detailQuery.isLoading}
            detailError={detailQuery.error}
            onRetryDetail={() => void detailQuery.refetch()}
            listQueryKey={listQueryKey}
            mounted={mounted}
            visible={Boolean(conversationId) && mobileView === "thread"}
            onBack={
              conversationId
                ? () => {
                    setMobileView("list");
                    router.push(listBaseHref);
                  }
                : undefined
            }
            onOpenContext={() => {
              if (window.matchMedia("(min-width: 1024px)").matches) return;
              if (window.matchMedia("(min-width: 768px)").matches) {
                setPanelDrawerOpen(true);
                return;
              }
              setMobileView("panel");
            }}
            showContextButton
          />
        </div>

        <div data-testid="beta-lead-context" className="min-h-0 min-w-0">
          <LeadContextPanel
            conversationId={conversationId}
            visible={mobileView === "panel"}
            onBack={
              conversationId
                ? () => setMobileView("thread")
                : undefined
            }
            className="border-l"
          />
        </div>
      </div>

      <Dialog
        open={panelDrawerOpen}
        onOpenChange={setPanelDrawerOpen}
        title="Contexto do lead"
        wide
        className="max-h-[85dvh] overflow-hidden p-0"
      >
        <LeadContextPanel
          conversationId={conversationId}
          visible
          className="max-h-[70dvh] border-0"
        />
      </Dialog>
    </div>
  );
}
