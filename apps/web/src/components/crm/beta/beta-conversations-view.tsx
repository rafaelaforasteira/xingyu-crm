"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  BETA_PIPELINE_ID,
  buildBetaConversationsHref,
  buildBetaKanbanHref,
} from "@/lib/beta-config";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { PipelineViewSwitcher } from "@/components/crm/pipeline-view-switcher";
import { ConversationWorkspace } from "@/components/crm/conversation/conversation-workspace";

export function BetaConversationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pipelineId = BETA_PIPELINE_ID;
  const conversationId = searchParams.get("conversation") ?? undefined;
  const searchQuery = searchParams.get("q") ?? "";

  const scope = useMemo(
    () => ({ type: "pipeline" as const, pipelineId }),
    [pipelineId],
  );

  const { data, error } = useQuery({
    queryKey: queryKeys.pipelines.detail(pipelineId),
    queryFn: () => pipelinesApi.get(pipelineId),
    retry: false,
  });

  const qOpt = searchQuery.trim() ? { q: searchQuery } : undefined;
  const getConversationHref = (id: string) =>
    buildBetaConversationsHref(id, qOpt);
  const clearHref = buildBetaConversationsHref(null, qOpt);

  const onExternalSearchChange = useCallback(
    (search: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", "conversations");
      const trimmed = search.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      router.replace(`/operacao?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return (
    <div data-testid="beta-conversations-view">
      <ConversationWorkspace
        scope={scope}
        conversationId={conversationId}
        basePath="/operacao"
        getConversationHref={getConversationHref}
        clearHref={clearHref}
        externalSearch={searchQuery}
        onExternalSearchChange={onExternalSearchChange}
        onSelectConversation={(id) => {
          router.replace(buildBetaConversationsHref(id, qOpt), {
            scroll: false,
          });
        }}
        workspaceTestId="beta-conversation-workspace"
        header={
          <>
            <div data-testid="beta-page-header">
              <PageHeader
                title={data?.name ?? "Pipeline"}
                description="Conversas vinculadas ao funil"
                actions={
                  <div className="flex flex-wrap items-center gap-3">
                    <PipelineViewSwitcher
                      pipelineId={pipelineId}
                      active="conversations"
                      kanbanHref={buildBetaKanbanHref(null, qOpt)}
                      conversationsHref={buildBetaConversationsHref(null, qOpt)}
                      kanbanLabel="Kanban"
                      dataTestIdPrefix="beta"
                    />
                  </div>
                }
              />
            </div>
            {error ? <ErrorBanner message={(error as Error).message} /> : null}
          </>
        }
      />
    </div>
  );
}
