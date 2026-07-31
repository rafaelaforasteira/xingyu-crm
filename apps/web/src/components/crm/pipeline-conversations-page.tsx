"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { PipelineViewSwitcher } from "@/components/crm/pipeline-view-switcher";
import { ConversationWorkspace } from "@/components/crm/conversation/conversation-workspace";

export function PipelineConversationsPage({
  pipelineId,
  conversationId,
}: {
  pipelineId: string;
  conversationId?: string;
}) {
  const scope = useMemo(
    () => ({ type: "pipeline" as const, pipelineId }),
    [pipelineId],
  );

  const { data, error } = useQuery({
    queryKey: queryKeys.pipelines.detail(pipelineId),
    queryFn: () => pipelinesApi.get(pipelineId),
    retry: false,
  });

  return (
    <ConversationWorkspace
      scope={scope}
      conversationId={conversationId}
      basePath={`/pipelines/${pipelineId}/conversations`}
      header={
        <>
          <PageHeader
            title={data?.name ?? "Pipeline"}
            description="Conversas vinculadas ao funil"
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <PipelineViewSwitcher pipelineId={pipelineId} active="conversations" />
                <Link href="/pipelines" className="text-sm text-primary hover:underline">
                  Todos os pipelines
                </Link>
              </div>
            }
          />
          {error ? <ErrorBanner message={(error as Error).message} /> : null}
        </>
      }
    />
  );
}
