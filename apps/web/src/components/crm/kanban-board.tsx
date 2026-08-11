"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dealsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Deal, Pipeline, PipelineStage } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { useUiStore } from "@/stores/ui";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MoveDealDialog, sortPipelineStages } from "@/components/crm/deal-board-dialogs";
import { ArrowRightLeft, Bell, Flag, Kanban } from "lucide-react";
import { formatLeadCode } from "@/components/crm/conversation/conversation-list-utils";
import { formatPrimaryPhoneForDisplay, resolvePrimaryPhone } from "@/lib/format-phone-display";
import { taskAttention, taskTooltip, visibleCardChips } from "./kanban-card-utils";

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

function OperationalDealSummary({
  deal,
  dragging,
  onOpen,
  selected,
}: {
  deal: Deal;
  dragging?: boolean;
  onOpen: (deal: Deal) => void;
  selected?: boolean;
}) {
  const contactName = deal.contact?.name ?? deal.company?.name ?? "Sem contato";
  const phone = resolvePrimaryPhone(deal.contact);
  const channel =
    deal.channel?.type === "WHATSAPP"
      ? deal.channel.displayName || deal.channel.name || "WhatsApp"
      : deal.channel?.displayName || deal.channel?.name || null;
  const tasks = taskAttention(deal.taskSummary);
  const chips = visibleCardChips(channel, deal.tags);
  const pointerDown = React.useRef<{ x: number; y: number } | null>(null);
  return (
    <article
      data-testid="deal-card"
      data-deal-id={deal.id}
      data-variant="operation"
      role="button"
      tabIndex={0}
      aria-pressed={selected || undefined}
      className={cn(
        "cursor-pointer rounded-xl border border-border/80 bg-card p-3 shadow-soft transition hover:border-primary/30 hover:shadow-card",
        dragging && "opacity-60 shadow-card ring-2 ring-primary/30",
        selected && "border-primary/50 ring-2 ring-primary/20",
        (deal.unreadCount ?? 0) > 0 && "border-primary/25 bg-primary/[0.03]",
      )}
      onPointerDown={(event) => {
        pointerDown.current = { x: event.clientX, y: event.clientY };
      }}
      onClick={(event) => {
        const start = pointerDown.current;
        if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6)
          onOpen(deal);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(deal);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold" data-testid="kanban-lead-code">
              {formatLeadCode(deal.leadSequence) ?? "Lead sem código"}
            </p>
            {(deal.unreadCount ?? 0) > 0 ? (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                title={`${deal.unreadCount} mensagem${deal.unreadCount === 1 ? "" : "s"} não lida${deal.unreadCount === 1 ? "" : "s"}`}
              >
                {deal.unreadCount}
              </span>
            ) : null}
          </div>
          <p className="mt-1 truncate text-sm font-medium" title={contactName}>
            {contactName}
          </p>
          {phone ? (
            <p
              className="truncate text-xs text-muted-foreground"
              title={formatPrimaryPhoneForDisplay(deal.contact)}
            >
              {formatPrimaryPhoneForDisplay(deal.contact)}
            </p>
          ) : null}
        </div>
        <div
          className="flex w-8 shrink-0 flex-col items-center gap-2"
          data-testid="kanban-card-rail"
        >
          {deal.owner ? (
            <span title={deal.owner.name}>
              <Avatar name={deal.owner.name} size="sm" />
            </span>
          ) : null}
          {tasks !== "none" ? (
            <span
              className={cn(
                "relative flex h-7 min-w-7 items-center justify-center rounded-full border text-[10px] font-semibold",
                tasks === "overdue"
                  ? "task-bell-attention border-destructive/40 bg-destructive/10 text-destructive"
                  : tasks === "today"
                    ? "task-bell-attention border-amber-400/50 bg-amber-50 text-amber-700"
                    : "border-border bg-muted text-muted-foreground",
              )}
              title={taskTooltip(deal.taskSummary)}
              aria-label={taskTooltip(deal.taskSummary)}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>{deal.taskSummary?.open}</span>
            </span>
          ) : null}
          {deal.priority ? (
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                deal.priority === "URGENT"
                  ? "bg-destructive/10 text-destructive"
                  : deal.priority === "HIGH"
                    ? "bg-orange-100 text-orange-700"
                    : deal.priority === "MEDIUM"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-500",
              )}
              title={`Prioridade ${PRIORITY_LABEL[deal.priority] ?? deal.priority}`}
              aria-label={`Prioridade ${PRIORITY_LABEL[deal.priority] ?? deal.priority}`}
            >
              <Flag className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      </div>
      {(deal.value ?? 0) > 0 ? (
        <p className="mt-3 text-sm font-semibold">{formatCurrency(deal.value!, deal.currency)}</p>
      ) : null}
      {deal.lastMessageAt ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Última interação · <ClientRelativeTime value={deal.lastMessageAt} />
        </p>
      ) : null}
      {chips.visible.length ? (
        <div className="mt-3 flex min-w-0 items-center gap-1 overflow-hidden">
          {chips.visible.map((chip) => (
            <Badge
              key={chip.id}
              variant={chip.channel ? "secondary" : "outline"}
              className="max-w-[8rem] truncate"
              title={chip.name}
            >
              {chip.name}
            </Badge>
          ))}
          {chips.overflow.length ? (
            <Badge variant="outline" title={chips.overflow.map((chip) => chip.name).join(", ")}>
              +{chips.overflow.length}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function DealCard({
  deal,
  dragging,
  onOpen,
  onMove,
  variant = "default",
  selected,
}: {
  deal: Deal;
  dragging?: boolean;
  onOpen: (deal: Deal) => void;
  onMove?: (deal: Deal) => void;
  variant?: "default" | "operation";
  selected?: boolean;
}) {
  const pointerDown = React.useRef<{ x: number; y: number } | null>(null);
  const contactName = deal.contact?.name ?? deal.company?.name ?? null;
  const showDealName =
    variant === "operation" &&
    contactName &&
    deal.name.trim().toLowerCase() !== contactName.trim().toLowerCase();
  const channel =
    deal.channel?.type === "WHATSAPP"
      ? "WhatsApp"
      : deal.channel?.displayName || deal.channel?.name || null;

  if (variant === "operation" || variant === "default") {
    return (
      <OperationalDealSummary deal={deal} dragging={dragging} onOpen={onOpen} selected={selected} />
    );
  }

  if (variant === "operation") {
    return (
      <article
        data-testid="deal-card"
        data-deal-id={deal.id}
        data-variant="operation"
        role="button"
        tabIndex={0}
        aria-pressed={selected || undefined}
        className={cn(
          "cursor-pointer rounded-xl border border-border/80 bg-card p-3 shadow-soft transition hover:border-primary/30 hover:shadow-card",
          dragging && "opacity-60 shadow-card ring-2 ring-primary/30",
          selected && "border-primary/50 ring-2 ring-primary/20",
          (deal.unreadCount ?? 0) > 0 && "border-primary/25 bg-primary/[0.03]",
        )}
        onPointerDown={(e) => {
          pointerDown.current = { x: e.clientX, y: e.clientY };
        }}
        onClick={(e) => {
          const start = pointerDown.current;
          if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
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
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-snug">
              {contactName || deal.name}
            </p>
            {showDealName ? (
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{deal.name}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {deal.awaitingReply ? (
              <span
                className="h-2 w-2 rounded-full bg-amber-500"
                title="Aguardando resposta"
                aria-label="Aguardando resposta"
              />
            ) : null}
            {(deal.unreadCount ?? 0) > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {deal.unreadCount}
              </span>
            ) : null}
            {onMove ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Mover ${deal.name}`}
                title="Mover card"
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onMove(deal);
                }}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        {deal.lastMessagePreview ? (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
            “{deal.lastMessagePreview}”
          </p>
        ) : !deal.conversationId ? (
          <p className="mt-1.5 text-xs text-muted-foreground/80">Sem conversa</p>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <p className="min-w-0 truncate">
            {channel ? `${channel} · ` : null}
            <ClientRelativeTime value={deal.lastMessageAt ?? deal.lastInteractionAt} />
          </p>
          {(deal.value ?? 0) > 0 ? (
            <span className="shrink-0 font-medium text-foreground">
              {formatCurrency(deal.value ?? 0, deal.currency)}
            </span>
          ) : deal.owner ? (
            <Avatar name={deal.owner.name} size="sm" />
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article
      data-testid="deal-card"
      data-deal-id={deal.id}
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
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
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
        <div className="flex shrink-0 items-center gap-1">
          {(deal.unreadCount ?? 0) > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {deal.unreadCount}
            </span>
          ) : null}
          {onMove ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={`Mover ${deal.name}`}
              title="Mover card"
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onMove(deal);
              }}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
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
        <p>
          Última interação: <ClientRelativeTime value={deal.lastInteractionAt} />
        </p>
        <p
          className={
            deal.nextTask?.dueAt && new Date(deal.nextTask.dueAt).getTime() < Date.now()
              ? "font-medium text-destructive"
              : undefined
          }
        >
          {deal.nextTask?.dueAt && new Date(deal.nextTask.dueAt).getTime() < Date.now()
            ? "Tarefa vencida: "
            : "Próxima tarefa: "}
          {deal.nextTask?.title ? deal.nextTask.title : "—"}
        </p>
      </div>
    </article>
  );
}

function SortableDealCard({
  deal,
  onOpen,
  onMove,
  variant,
  selected,
}: {
  deal: Deal;
  onOpen: (deal: Deal) => void;
  onMove: (deal: Deal) => void;
  variant?: "default" | "operation";
  selected?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: "deal", deal },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard
        deal={deal}
        dragging={isDragging}
        onOpen={onOpen}
        onMove={onMove}
        variant={variant}
        selected={selected}
      />
    </div>
  );
}

function StageColumn({
  stage,
  onOpen,
  onMove,
  variant,
  selectedDealId,
  fillColumns,
}: {
  stage: PipelineStage;
  onOpen: (deal: Deal) => void;
  onMove: (deal: Deal) => void;
  variant?: "default" | "operation";
  selectedDealId?: string | null;
  fillColumns?: boolean;
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
      data-testid="kanban-stage"
      data-stage-id={stage.id}
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col rounded-xl border border-border/70 bg-muted/40",
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
        <div
          className={cn(
            "scrollbar-thin flex flex-col gap-2 overflow-y-auto p-2",
            fillColumns || variant === "operation" ? "min-h-0 flex-1" : "max-h-[calc(100vh-14rem)]",
          )}
        >
          {deals.map((deal) => (
            <SortableDealCard
              key={deal.id}
              deal={deal}
              onOpen={onOpen}
              onMove={onMove}
              variant={variant}
              selected={selectedDealId === deal.id}
            />
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
  filterStageId,
  idleDays,
  variant = "default",
  selectedDealId,
  className,
  fillColumns = false,
}: {
  pipeline: Pipeline;
  onOpenDeal?: (deal: Deal) => void;
  filterStageId?: string;
  idleDays?: number;
  variant?: "default" | "operation";
  selectedDealId?: string | null;
  className?: string;
  /** When true, columns grow to fill available width (min 280px). */
  fillColumns?: boolean;
}) {
  const queryClient = useQueryClient();
  const openDealDrawer = useUiStore((s) => s.openDealDrawer);
  const [activeDeal, setActiveDeal] = React.useState<Deal | null>(null);
  const [dealToMove, setDealToMove] = React.useState<Deal | null>(null);

  const filteredStages = React.useMemo(() => {
    const cutoff = idleDays != null ? Date.now() - idleDays * 86_400_000 : null;
    return sortPipelineStages(pipeline.stages)
      .filter((stage) => !filterStageId || stage.id === filterStageId)
      .map((stage) => ({
        ...stage,
        deals: (stage.deals ?? []).filter((deal) => {
          if (cutoff == null) return true;
          const reference = deal.lastInteractionAt ?? deal.updatedAt ?? deal.createdAt;
          if (!reference) return true;
          return new Date(reference).getTime() < cutoff;
        }),
      }));
  }, [pipeline.stages, filterStageId, idleDays]);

  const [stages, setStages] = React.useState<PipelineStage[]>(filteredStages);
  const suppressOpenUntil = React.useRef(0);

  React.useEffect(() => {
    setStages(filteredStages);
  }, [filteredStages]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const moveMutation = useMutation({
    mutationFn: ({
      dealId,
      stageId,
    }: {
      dealId: string;
      stageId: string;
      previousStages: PipelineStage[];
    }) => dealsApi.move(dealId, stageId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.board(pipeline.id),
      });
      toast.success("Negócio movido");
    },
    onError: (
      err: Error,
      variables: {
        dealId: string;
        stageId: string;
        previousStages: PipelineStage[];
      },
    ) => {
      setStages(variables.previousStages);
      toast.error(err.message || "Falha ao mover negócio");
    },
  });

  const findStageOfDeal = (dealId: string) =>
    stages.find((s) => s.deals?.some((d) => d.id === dealId));

  const onDragStart = (event: DragStartEvent) => {
    const deal = event.active.data.current?.deal as Deal | undefined;
    if (deal) {
      suppressOpenUntil.current = Number.POSITIVE_INFINITY;
      setActiveDeal(deal);
    }
  };

  const onDragEnd = (event: DragEndEvent) => {
    suppressOpenUntil.current = Date.now() + 250;
    setActiveDeal(null);
    const { active, over } = event;
    if (!over || moveMutation.isPending) return;

    const dealId = String(active.id);
    const fromStage = findStageOfDeal(dealId);
    if (!fromStage) return;

    let toStageId = String(over.id);
    const overDealStage = findStageOfDeal(toStageId);
    if (overDealStage) toStageId = overDealStage.id;

    if (fromStage.id === toStageId || !stages.some((stage) => stage.id === toStageId)) {
      return;
    }

    const deal = fromStage.deals?.find((d) => d.id === dealId);
    if (!deal) return;

    const previousStages = stages;
    setStages(
      previousStages.map((stage) => {
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

    moveMutation.mutate({ dealId, stageId: toStageId, previousStages });
  };

  const onDragCancel = (_event: DragCancelEvent) => {
    suppressOpenUntil.current = Date.now() + 250;
    setActiveDeal(null);
  };

  const handleOpen = (deal: Deal) => {
    if (Date.now() < suppressOpenUntil.current) return;
    if (onOpenDeal) onOpenDeal(deal);
    else openDealDrawer(deal.id);
  };

  const handleDialogMove = (deal: Deal, targetPipelineId: string, targetStageId: string) => {
    setStages((current) =>
      current.map((stage) => {
        const remainingDeals = (stage.deals ?? []).filter((item) => item.id !== deal.id);
        if (targetPipelineId === pipeline.id && stage.id === targetStageId) {
          return {
            ...stage,
            deals: [
              ...remainingDeals,
              {
                ...deal,
                pipelineId: targetPipelineId,
                stageId: targetStageId,
              },
            ],
          };
        }
        return { ...stage, deals: remainingDeals };
      }),
    );
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
      onDragCancel={onDragCancel}
    >
      <div
        data-testid="kanban-columns"
        data-fill-columns={fillColumns ? "true" : "false"}
        className={cn(
          "grid min-h-0 grid-flow-col gap-3 overflow-x-auto pb-2",
          fillColumns ? "h-full w-full" : null,
          className,
        )}
        style={{
          gridAutoColumns: fillColumns ? "minmax(280px, 1fr)" : "18rem",
        }}
      >
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            onOpen={handleOpen}
            onMove={setDealToMove}
            variant={variant}
            selectedDealId={selectedDealId}
            fillColumns={fillColumns}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? (
          <DealCard deal={activeDeal} dragging onOpen={() => undefined} variant={variant} />
        ) : null}
      </DragOverlay>
      <MoveDealDialog
        deal={dealToMove}
        pipeline={{ ...pipeline, stages }}
        onOpenChange={(open) => {
          if (!open) setDealToMove(null);
        }}
        onMoved={handleDialogMove}
      />
    </DndContext>
  );
}
