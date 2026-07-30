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
}: {
  scope: ConversationWorkspaceScope;
  conversationId?: string;
  basePath: string;
  header?: React.ReactNode;
  className?: string;
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

  const listParams = React.useMemo(
    () => ({
      pageSize: 30,
      pipelineId: scope.type === "pipeline" ? scope.pipelineId : undefined,
    }),
    [scope],
  );

  const bootstrapListQuery = useQuery({
    queryKey: queryKeys.conversations.list(listParams),
    queryFn: async () => {
      const response = await conversationsApi.list(listParams);
      return normalizeConversationListItems(response);
    },
    retry: false,
  });

  React.useEffect(() => {
    const first = bootstrapListQuery.data?.[0];
    if (!conversationId && first) {
      router.replace(`${basePath}/${encodeURIComponent(first.id)}`);
    }
  }, [basePath, bootstrapListQuery.data, conversationId, router]);

  const detailQuery = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId ?? ""),
    queryFn: () => conversationsApi.get(conversationId!),
    enabled: Boolean(conversationId),
    retry: false,
  });

  const listQueryKey = queryKeys.conversations.list(listParams);

  const showList =
    !conversationId || mobileView === "list";

  return (
    <div className={cn("flex h-[calc(100dvh-7.5rem)] min-h-[34rem] flex-col", className)}>
      {header}
      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-card md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_300px]">
        <div
          className={cn(
            "min-h-0 border-border md:border-r",
            showList ? "flex flex-col" : "hidden md:flex md:flex-col",
          )}
        >
          <ConversationList
            scope={scope}
            activeId={conversationId}
            basePath={basePath}
            visible={showList}
            mounted={mounted}
          />
        </div>

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
                  router.push(basePath);
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
