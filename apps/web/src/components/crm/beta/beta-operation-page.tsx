"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BETA_PIPELINE_ID,
  parseBetaView,
  type BetaView,
} from "@/lib/beta-config";
import { BetaKanbanView } from "./beta-kanban-view";
import { BetaConversationsView } from "./beta-conversations-view";

export function BetaOperationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseBetaView(searchParams.get("view"));

  React.useEffect(() => {
    const rawView = searchParams.get("view");
    const pipeline = searchParams.get("pipeline");
    const needsView =
      rawView != null && rawView !== "kanban" && rawView !== "conversations";
    const needsStripPipeline = Boolean(pipeline);
    const needsDefaultView = rawView == null;

    if (!needsView && !needsStripPipeline && !needsDefaultView) return;

    const params = new URLSearchParams(searchParams.toString());
    if (needsView || needsDefaultView) params.set("view", "kanban");
    params.delete("pipeline");
    // Ignore arbitrary pipeline ids — always beta pipeline in data layer.
    void BETA_PIPELINE_ID;
    router.replace(`/operacao?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <div data-testid="beta-operation-page" className="min-h-0 w-full">
      {view === "conversations" ? <BetaConversationsView /> : <BetaKanbanView />}
    </div>
  );
}

export type { BetaView };
