"use client";

import * as React from "react";
import Link from "next/link";
import { Kanban, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineView = "kanban" | "conversations";

/**
 * Última visão mostrada. Kanban e Conversas são telas diferentes, então o
 * seletor é recriado ao trocar; com isto ele nasce na posição anterior e
 * desliza até a nova, em vez de aparecer pronto.
 */
let lastShownView: PipelineView | null = null;

/**
 * Segmented Pipeline / Conversas control with a sliding purple indicator.
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
  const conversations = conversationsHref ?? `/pipelines/${pipelineId}/conversations`;
  const switcherTestId = dataTestIdPrefix === "beta" ? "beta-view-switcher" : "operation-view-switcher";
  const kanbanTestId = dataTestIdPrefix === "beta" ? "beta-view-kanban" : "operation-view-kanban";
  const conversationsTestId =
    dataTestIdPrefix === "beta" ? "beta-view-conversations" : "operation-view-conversations";

  const itemRefs = React.useRef<Record<PipelineView, HTMLElement | null>>({ kanban: null, conversations: null });
  const [shown, setShown] = React.useState<PipelineView>(lastShownView ?? active);
  const [indicator, setIndicator] = React.useState<{ left: number; width: number } | null>(null);
  const [animate, setAnimate] = React.useState(false);

  const measure = React.useCallback((view: PipelineView) => {
    const el = itemRefs.current[view];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, []);

  // 1º quadro: posição anterior, sem animação. 2º quadro: liga a animação e vai para a atual.
  React.useLayoutEffect(() => {
    measure(shown);
  }, [measure, shown]);
  React.useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setAnimate(true);
      setShown(active);
    });
    lastShownView = active;
    return () => window.cancelAnimationFrame(id);
  }, [active]);

  const items: { view: PipelineView; label: string; href: string; icon: typeof Kanban; testId: string }[] = [
    { view: "kanban", label: kanbanLabel, href: kanban, icon: Kanban, testId: kanbanTestId },
    { view: "conversations", label: "Conversas", href: conversations, icon: MessagesSquare, testId: conversationsTestId },
  ];

  const itemClass = (selected: boolean) =>
    cn(
      "relative z-10 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors duration-200",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      selected ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div
      className="relative inline-flex h-10 items-center gap-1 rounded-xl border border-border/70 bg-card p-1"
      role="tablist"
      aria-label="Visualização do pipeline"
      data-testid={switcherTestId}
    >
      {indicator ? (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-1 top-1 rounded-lg bg-primary shadow-sm",
            animate && "transition-[left,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          )}
          style={{ left: indicator.left, width: indicator.width }}
        />
      ) : null}
      {items.map(({ view, label, href, icon: Icon, testId }) => {
        const selected = shown === view;
        const common = {
          role: "tab" as const,
          "aria-selected": active === view,
          "data-testid": testId,
          className: itemClass(selected),
          ref: (node: HTMLElement | null) => {
            itemRefs.current[view] = node;
          },
        };
        const content = (
          <>
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </>
        );
        return onNavigate ? (
          <button key={view} type="button" {...common} onClick={() => onNavigate(view)}>
            {content}
          </button>
        ) : (
          <Link key={view} href={href} {...common}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
