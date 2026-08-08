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
  dataTestIdPrefix = "operation",
}: {
  pipelineId: string;
  active: PipelineView;
  kanbanHref?: string;
  conversationsHref?: string;
  /** Operação passa "Pipeline"; rotas clássicas mantêm "Kanban". */
  kanbanLabel?: string;
  /** When set, uses buttons instead of Links (query-param navigation). */
  onNavigate?: (view: PipelineView) => void;
  /** Prefix for data-testid attributes (`operation` or `beta`). */
  dataTestIdPrefix?: "operation" | "beta";
}) {
  const kanban = kanbanHref ?? `/pipelines/${pipelineId}`;
  const conversations =
    conversationsHref ?? `/pipelines/${pipelineId}/conversations`;
  const switcherTestId =
    dataTestIdPrefix === "beta"
      ? "beta-view-switcher"
      : "operation-view-switcher";
  const kanbanTestId =
    dataTestIdPrefix === "beta" ? "beta-view-kanban" : "operation-view-kanban";
  const conversationsTestId =
    dataTestIdPrefix === "beta"
      ? "beta-view-conversations"
      : "operation-view-conversations";

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
      data-testid={switcherTestId}
    >
      {onNavigate ? (
        <>
          <button
            type="button"
            role="tab"
            aria-selected={active === "kanban"}
            data-testid={kanbanTestId}
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
            data-testid={conversationsTestId}
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
            data-testid={kanbanTestId}
            className={itemClass(active === "kanban")}
          >
            <Kanban className="h-3.5 w-3.5" aria-hidden />
            {kanbanLabel}
          </Link>
          <Link
            href={conversations}
            role="tab"
            aria-selected={active === "conversations"}
            data-testid={conversationsTestId}
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
