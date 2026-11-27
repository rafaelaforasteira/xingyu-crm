"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseBetaView, type BetaView } from "@/lib/beta-config";
import { BetaKanbanView } from "./beta-kanban-view";
import { BetaConversationsView } from "./beta-conversations-view";

export function BetaOperationPage({ pipelineId }: { pipelineId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseBetaView(searchParams.get("view"));

  React.useEffect(() => {
    const rawView = searchParams.get("view");
    const needsView =
      rawView != null && rawView !== "kanban" && rawView !== "conversations";
    const needsDefaultView = rawView == null;

    if (!needsView && !needsDefaultView) return;

    const params = new URLSearchParams(searchParams.toString());
    if (needsView || needsDefaultView) params.set("view", "kanban");
    router.replace(`/pipelines/${pipelineId}?${params.toString()}`, { scroll: false });
  }, [pipelineId, router, searchParams]);

  return (
    <div data-testid="beta-operation-page" className="min-h-0 w-full">
      {view === "conversations" ? (
        <BetaConversationsView pipelineId={pipelineId} />
      ) : (
        <BetaKanbanView pipelineId={pipelineId} />
      )}
    </div>
  );
}

export type { BetaView };
