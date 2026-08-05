"use client";

import Link from "next/link";
import { Kanban, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineView = "kanban" | "conversations";

/**
 * Segmented Pipeline / Conversas control.
 * Prefer explicit hrefs or onNavigate so /operacao and /pipelines share the look.
 */
export function PipelineViewSwitcher({
  pipelineId,
  active,
  kanbanHref,
  conversationsHref,
  kanbanLabel = "Kanban",
  onNavigate,
}: {
  pipelineId: string;
  active: PipelineView;
  kanbanHref?: string;
  conversationsHref?: string;
  /** Operação passa "Pipeline"; rotas clássicas mantêm "Kanban". */
  kanbanLabel?: string;
  /** When set, uses buttons instead of Links (query-param navigation). */
  onNavigate?: (view: PipelineView) => void;
}) {
  const kanban = kanbanHref ?? `/pipelines/${pipelineId}`;
  const conversations =
    conversationsHref ?? `/pipelines/${pipelineId}/conversations`;

  const itemClass = (selected: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      selected
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div
      className="inline-flex gap-1 rounded-lg border border-border bg-muted/30 p-1"
      role="tablist"
      aria-label="Visualização do pipeline"
      data-testid="operation-view-switcher"
    >
      {onNavigate ? (
        <>
          <button
            type="button"
            role="tab"
            aria-selected={active === "kanban"}
            data-testid="operation-view-kanban"
            className={itemClass(active === "kanban")}
            onClick={() => onNavigate("kanban")}
          >
            <Kanban className="h-3.5 w-3.5" aria-hidden />
            {kanbanLabel}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={active === "conversations"}
            data-testid="operation-view-conversations"
            className={itemClass(active === "conversations")}
            onClick={() => onNavigate("conversations")}
          >
            <MessagesSquare className="h-3.5 w-3.5" aria-hidden />
            Conversas
          </button>
        </>
      ) : (
        <>
          <Link
            href={kanban}
            role="tab"
            aria-selected={active === "kanban"}
            data-testid="operation-view-kanban"
            className={itemClass(active === "kanban")}
          >
            <Kanban className="h-3.5 w-3.5" aria-hidden />
            {kanbanLabel}
          </Link>
          <Link
            href={conversations}
            role="tab"
            aria-selected={active === "conversations"}
            data-testid="operation-view-conversations"
            className={itemClass(active === "conversations")}
          >
            <MessagesSquare className="h-3.5 w-3.5" aria-hidden />
            Conversas
          </Link>
        </>
      )}
    </div>
  );
}
