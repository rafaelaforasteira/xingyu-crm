"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type PipelineView = "kanban" | "conversations";

export function PipelineViewSwitcher({
  pipelineId,
  active,
}: {
  pipelineId: string;
  active: PipelineView;
}) {
  return (
    <div
      className="inline-flex gap-1 rounded-lg border border-border bg-muted/30 p-1"
      role="tablist"
      aria-label="Visualização do pipeline"
    >
      <Link
        href={`/pipelines/${pipelineId}`}
        role="tab"
        aria-selected={active === "kanban"}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          active === "kanban"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Kanban
      </Link>
      <Link
        href={`/pipelines/${pipelineId}/conversations`}
        role="tab"
        aria-selected={active === "conversations"}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          active === "conversations"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Conversas
      </Link>
    </div>
  );
}
