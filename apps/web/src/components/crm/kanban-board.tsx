"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dealsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Deal, Pipeline, PipelineStage } from "@/lib/types";
import { cn, formatCurrency, formatRelative } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Kanban } from "lucide-react";

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

function priorityVariant(p?: string) {
  if (p === "URGENT" || p === "HIGH") return "destructive" as const;
  if (p === "MEDIUM") return "warning" as const;
  return "secondary" as const;
}

export function DealCard({
  deal,
  dragging,
  onOpen,
}: {
  deal: Deal;
  dragging?: boolean;
  onOpen: (deal: Deal) => void;
}) {
  const pointerDown = React.useRef<{ x: number; y: number } | null>(null);

  return (
    <article
      role="button"
      tabIndex={0}
      className={cn(
        "cursor-pointer rounded-xl border border-border/80 bg-card p-3 shadow-soft transition hover:border-primary/30 hover:shadow-card",
        dragging && "opacity-60 shadow-card ring-2 ring-primary/30",
      )}
      onPointerDown={(e) => {
        pointerDown.current = { x: e.clientX, y: e.clientY };
      }}
      onClick={(e) => {
        const start = pointerDown.current;
        if (
          start &&
          Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6
        ) {
          return;
        }
        onOpen(deal);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(deal);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug">{deal.name}</p>
        {(deal.unreadCount ?? 0) > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {deal.unreadCount}
          </span>
        ) : null}
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {deal.contact?.name ?? deal.company?.name ?? "Sem contato"}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">
          {formatCurrency(deal.value ?? 0, deal.currency)}
        </p>
        {deal.owner ? <Avatar name={deal.owner.name} size="sm" /> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {deal.priority ? (
          <Badge variant={priorityVariant(deal.priority)}>
            {PRIORITY_LABEL[deal.priority] ?? deal.priority}
          </Badge>
        ) : null}
        {deal.tags?.slice(0, 2).map((t) => (
          <Badge key={t.id} variant="outline">
            {t.name}
          </Badge>
        ))}
      </div>
      <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
        <p>Última interação: {formatRelative(deal.lastInteractionAt)}</p>
        <p>
          Próxima tarefa:{" "}
          {deal.nextTask?.title ? deal.nextTask.title : "—"}
        </p>
      </div>
    </article>
  );
}

function SortableDealCard({
  deal,
  onOpen,
}: {
  deal: Deal;
  onOpen: (deal: Deal) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, data: { type: "deal", deal } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} dragging={isDragging} onOpen={onOpen} />
    </div>
  );
}

function StageColumn({
  stage,
  onOpen,
}: {
  stage: PipelineStage;
  onOpen: (deal: Deal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: "stage", stage },
  });
  const deals = stage.deals ?? [];
  const total = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border/70 bg-muted/40",
        isOver && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: stage.color ?? "hsl(var(--primary))" }}
            />
            <h3 className="truncate text-sm font-semibold">{stage.name}</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {deals.length} · {formatCurrency(total)}
          </p>
        </div>
      </div>
      <SortableContext items={deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        <div className="scrollbar-thin flex max-h-[calc(100vh-14rem)] flex-col gap-2 overflow-y-auto p-2">
          {deals.map((deal) => (
            <SortableDealCard key={deal.id} deal={deal} onOpen={onOpen} />
          ))}
          {deals.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Arraste negócios aqui
            </p>
          ) : null}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({
  pipeline,
  onOpenDeal,
}: {
  pipeline: Pipeline;
  onOpenDeal?: (deal: Deal) => void;
}) {
  const queryClient = useQueryClient();
  const openDealDrawer = useUiStore((s) => s.openDealDrawer);
  const [activeDeal, setActiveDeal] = React.useState<Deal | null>(null);
  const [stages, setStages] = React.useState<PipelineStage[]>(pipeline.stages ?? []);

  React.useEffect(() => {
    setStages(pipeline.stages ?? []);
  }, [pipeline]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const moveMutation = useMutation({
    mutationFn: ({ dealId, stageId }: { dealId: string; stageId: string }) =>
      dealsApi.move(dealId, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.board(pipeline.id) });
      toast.success("Negócio movido");
    },
    onError: (err: Error) => {
      setStages(pipeline.stages ?? []);
      toast.error(err.message || "Falha ao mover negócio");
    },
  });

  const findStageOfDeal = (dealId: string) =>
    stages.find((s) => s.deals?.some((d) => d.id === dealId));

  const onDragStart = (event: DragStartEvent) => {
    const deal = event.active.data.current?.deal as Deal | undefined;
    if (deal) setActiveDeal(deal);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const fromStage = findStageOfDeal(dealId);
    if (!fromStage) return;

    let toStageId = String(over.id);
    const overDealStage = findStageOfDeal(toStageId);
    if (overDealStage) toStageId = overStageId(overDealStage);

    if (fromStage.id === toStageId) return;

    const deal = fromStage.deals?.find((d) => d.id === dealId);
    if (!deal) return;

    setStages((prev) =>
      prev.map((stage) => {
        if (stage.id === fromStage.id) {
          return {
            ...stage,
            deals: (stage.deals ?? []).filter((d) => d.id !== dealId),
          };
        }
        if (stage.id === toStageId) {
          return {
            ...stage,
            deals: [...(stage.deals ?? []), { ...deal, stageId: toStageId }],
          };
        }
        return stage;
      }),
    );

    moveMutation.mutate({ dealId, stageId: toStageId });
  };

  function overStageId(stage: PipelineStage) {
    return stage.id;
  }

  const handleOpen = (deal: Deal) => {
    if (onOpenDeal) onOpenDeal(deal);
    else openDealDrawer(deal.id);
  };

  if (!stages.length) {
    return (
      <EmptyState
        icon={Kanban}
        title="Pipeline sem estágios"
        description="Configure os estágios nas configurações ou aguarde os dados da API."
      />
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((stage) => (
            <StageColumn key={stage.id} stage={stage} onOpen={handleOpen} />
          ))}
      </div>
      <DragOverlay>
        {activeDeal ? <DealCard deal={activeDeal} dragging onOpen={() => undefined} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
