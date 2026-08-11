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
import { resolveSelectedConversationId } from "@/components/crm/conversation/conversation-selection";
import { PipelineStageSettingsButton } from "@/components/crm/operation/pipeline-stage-settings-button";

function buildConversationsHrefPreserving(
  searchParams: URLSearchParams,
  conversationId?: string | null,
): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set("view", "conversations");
  if (conversationId) params.set("conversation", conversationId);
  else params.delete("conversation");
  return `/operacao?${params.toString()}`;
}

export function BetaConversationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pipelineId = BETA_PIPELINE_ID;
  const conversationId = resolveSelectedConversationId(searchParams.get("conversation"));
  const searchQuery = searchParams.get("q") ?? "";

  const scope = useMemo(() => ({ type: "pipeline" as const, pipelineId }), [pipelineId]);

  const { data, error } = useQuery({
    queryKey: queryKeys.pipelines.detail(pipelineId),
    queryFn: () => pipelinesApi.get(pipelineId),
    retry: false,
  });

  const qOpt = searchQuery.trim() ? { q: searchQuery } : undefined;

  const getConversationHref = useCallback(
    (id: string) => buildConversationsHrefPreserving(searchParams, id),
    [searchParams],
  );
  const clearHref = useMemo(
    () => buildConversationsHrefPreserving(searchParams, null),
    [searchParams],
  );

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
          router.replace(buildConversationsHrefPreserving(searchParams, id), {
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
                    <PipelineStageSettingsButton
                      pipelineId={pipelineId}
                      pipelineName={data?.name ?? "Pipeline"}
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
