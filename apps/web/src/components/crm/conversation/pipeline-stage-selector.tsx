"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2 } from "lucide-react";
import { pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMoveDealStage } from "@/hooks/use-move-deal-stage";
import {
  resolveStageLabel,
  sortPipelineStages,
} from "./pipeline-stage-utils";

export function PipelineStageSelector({
  dealId,
  pipelineId,
  stageId,
  stageName,
  conversationId,
  disabledReason,
  className,
}: {
  dealId?: string | null;
  pipelineId?: string | null;
  stageId?: string | null;
  stageName?: string | null;
  conversationId?: string | null;
  disabledReason?: string | null;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const moveStage = useMoveDealStage();

  const stagesQuery = useQuery({
    queryKey: queryKeys.pipelines.detail(pipelineId ?? ""),
    queryFn: () => pipelinesApi.get(pipelineId!),
    enabled: Boolean(pipelineId) && Boolean(dealId),
    staleTime: 60_000,
  });

  const stages = React.useMemo(
    () => sortPipelineStages(stagesQuery.data?.stages ?? []),
    [stagesQuery.data?.stages],
  );

  const currentName = resolveStageLabel({
    stages,
    stageId,
    stageName,
    hasDeal: Boolean(dealId),
  });

  const noDeal = !dealId || !pipelineId;
  const noStages = !noDeal && stages.length === 0 && !stagesQuery.isLoading;
  const isDisabled =
    noDeal || noStages || moveStage.isPending || stagesQuery.isLoading;
  const tooltipText = noDeal
    ? (disabledReason ?? "Esta conversa não possui um lead vinculado.")
    : noStages
      ? "Sem etapas disponíveis"
      : "Alterar etapa do lead";

  const ariaLabel = noDeal
    ? "Alterar etapa do lead. Sem lead vinculado"
    : `Alterar etapa do lead. Etapa atual: ${currentName}`;

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        listRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const selectStage = (stage: PipelineStage) => {
    if (!dealId || !pipelineId || moveStage.isPending) return;
    setOpen(false);
    triggerRef.current?.focus();
    if (stage.id === stageId) return;
    moveStage.mutate({
      dealId,
      pipelineId,
      stageId: stage.id,
      stageName: stage.name,
      previousStageId: stageId ?? "",
      conversationId,
    });
  };

  return (
    <div className="relative flex-shrink-0">
      <button
        ref={triggerRef}
        type="button"
        data-testid="pipeline-stage-selector"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={isDisabled}
        title={tooltipText}
        onClick={() => {
          if (isDisabled) return;
          setOpen((value) => !value);
        }}
        className={cn(
          "inline-flex h-9 min-w-[160px] max-w-[240px] flex-shrink-0 items-center justify-between gap-2 rounded-lg border border-input bg-white px-3 text-left text-sm shadow-sm transition-colors",
          "hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {noStages ? "Sem etapas disponíveis" : currentName}
        </span>
        {moveStage.isPending ? (
          <Loader2
            className="h-3.5 w-3.5 flex-shrink-0 animate-spin"
            aria-hidden
          />
        ) : (
          <ChevronDown
            className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
      </button>

      {open && !isDisabled ? (
        <ul
          ref={listRef}
          role="listbox"
          aria-label="Etapas do funil"
          data-testid="pipeline-stage-options"
          className="absolute right-0 z-40 mt-1 max-h-64 min-w-full max-w-[240px] overflow-y-auto rounded-lg border border-border bg-white py-1 shadow-md"
        >
          {stages.map((stage) => {
            const selected = stage.id === stageId;
            return (
              <li key={stage.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  data-testid={`pipeline-stage-option-${stage.id}`}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent/50",
                    selected && "bg-accent font-medium",
                  )}
                  onClick={() => selectStage(stage)}
                >
                  {stage.color ? (
                    <span
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: stage.color }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="min-w-0 truncate">{stage.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
