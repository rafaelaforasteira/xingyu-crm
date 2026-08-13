"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-controls";
import { pipelineStagesApi } from "@/lib/api";
import { STAGE_COLOR_PRESETS, isValidStageName, sanitizeStageName } from "@/lib/operation-utils";
import { queryKeys } from "@/lib/query-keys";
import type { PipelineStage } from "@/lib/types";
import { cn } from "@/lib/utils";

type StageDraft = { name: string; color: string };

function StageFormDialog({
  open,
  title,
  initial,
  pending,
  existingNames,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial?: PipelineStage | null;
  pending: boolean;
  existingNames: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: StageDraft) => Promise<void>;
}) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState<string>(STAGE_COLOR_PRESETS[1]);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setColor(initial?.color ?? STAGE_COLOR_PRESETS[1]);
    setError(null);
  }, [initial, open]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = sanitizeStageName(name);
    if (!isValidStageName(cleaned))
      return setError("Informe um nome válido com até 80 caracteres.");
    if (
      existingNames.some(
        (item) => item.localeCompare(cleaned, "pt-BR", { sensitivity: "base" }) === 0,
      )
    ) {
      return setError("Já existe uma etapa com este nome.");
    }
    setError(null);
    try {
      await onSubmit({ name: cleaned, color });
    } catch (value) {
      setError(value instanceof Error ? value.message : "Não foi possível salvar a etapa.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title}>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <div className="space-y-1.5">
          <Label htmlFor="managed-stage-name">Nome *</Label>
          <Input
            id="managed-stage-name"
            value={name}
            maxLength={80}
            autoFocus
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(error)}
          />
        </div>
        <div className="space-y-1.5">
          <Label id="managed-stage-color">Cor</Label>
          <div
            role="listbox"
            aria-labelledby="managed-stage-color"
            className="flex flex-wrap gap-2"
          >
            {STAGE_COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                role="option"
                aria-label={`Cor ${preset}`}
                aria-selected={color === preset}
                className={cn(
                  "h-7 w-7 rounded-full border-2",
                  color === preset ? "scale-110 border-foreground" : "border-transparent",
                )}
                style={{ backgroundColor: preset }}
                onClick={() => setColor(preset)}
              />
            ))}
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : initial ? "Salvar" : "Criar etapa"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function SortableStageRow({
  stage,
  menuOpen,
  onMenu,
  onEdit,
  onDelete,
}: {
  stage: PipelineStage;
  menuOpen: boolean;
  onMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sortable = useSortable({ id: stage.id });
  return (
    <li
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className="relative flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2"
      data-testid="managed-stage-row"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label={`Reordenar ${stage.name}`}
        {...sortable.attributes}
        {...sortable.listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: stage.color ?? "#94A3B8" }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium" title={stage.name}>
        {stage.name}
      </span>
      {stage.isInitial ? <span className="text-[10px] text-muted-foreground">Inicial</span> : null}
      <span className="text-xs text-muted-foreground">{stage._count?.deals ?? 0}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        aria-label={`Ações de ${stage.name}`}
        onClick={onMenu}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {menuOpen ? (
        <div
          role="menu"
          className="absolute bottom-9 right-2 z-20 w-32 rounded-md border border-border bg-card p-1 shadow-lg"
        >
          <button
            role="menuitem"
            className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
            onClick={onEdit}
          >
            Editar
          </button>
          <button
            role="menuitem"
            className="w-full rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-muted"
            onClick={onDelete}
          >
            Excluir
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function ConfigurePipelineStagesDialog({
  open,
  pipelineId,
  pipelineName,
  onOpenChange,
  onChanged,
}: {
  open: boolean;
  pipelineId: string;
  pipelineName: string;
  onOpenChange: (open: boolean) => void;
  onChanged: () => Promise<void> | void;
}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.pipelines.stages(pipelineId),
    queryFn: () => pipelineStagesApi.list(pipelineId),
    enabled: open,
  });
  const [stages, setStages] = React.useState<PipelineStage[]>([]);
  const [editing, setEditing] = React.useState<PipelineStage | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<PipelineStage | null>(null);
  const [targetStageId, setTargetStageId] = React.useState("");
  const [menuId, setMenuId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  React.useEffect(() => {
    if (query.data) setStages([...query.data].sort((a, b) => a.position - b.position));
  }, [query.data]);
  React.useEffect(() => {
    if (!deleting) setTargetStageId("");
  }, [deleting]);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.stages(pipelineId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.board(pipelineId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.detail(pipelineId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all }),
    ]);
    await onChanged();
  };
  const reorder = async (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const previous = stages;
    const next = arrayMove(
      stages,
      stages.findIndex((item) => item.id === event.active.id),
      stages.findIndex((item) => item.id === event.over!.id),
    ).map((item, position) => ({ ...item, position }));
    setStages(next);
    try {
      await pipelineStagesApi.reorder(
        pipelineId,
        next.map((item) => item.id),
      );
      await refresh();
      toast.success("Ordem das etapas atualizada.");
    } catch {
      setStages(previous);
      toast.error("Não foi possível reordenar as etapas.");
    }
  };
  const save = async (draft: StageDraft, stage?: PipelineStage | null) => {
    setPending(true);
    try {
      if (stage) await pipelineStagesApi.update(pipelineId, stage.id, draft);
      else await pipelineStagesApi.create(pipelineId, { ...draft, type: "OPEN" });
      await refresh();
      setEditing(null);
      setCreating(false);
      toast.success(stage ? "Etapa atualizada." : "Etapa criada.");
    } finally {
      setPending(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    if ((deleting._count?.deals ?? 0) > 0 && !targetStageId) return;
    setPending(true);
    try {
      await pipelineStagesApi.remove(pipelineId, deleting.id, targetStageId || undefined);
      await refresh();
      setDeleting(null);
      toast.success("Etapa excluída.");
    } catch (value) {
      toast.error(value instanceof Error ? value.message : "Não foi possível excluir a etapa.");
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Configurar esteira"
        description={pipelineName}
        wide
      >
        <div className="space-y-4" data-testid="pipeline-stage-manager">
          <div>
            <h3 className="text-sm font-semibold">Etapas</h3>
            <p className="text-xs text-muted-foreground">
              Arraste para reordenar. O número indica quantos negócios estão na etapa.
            </p>
          </div>
          {query.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando etapas…</p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void reorder(event)}
            >
              <SortableContext
                items={stages.map((stage) => stage.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {stages.map((stage) => (
                    <SortableStageRow
                      key={stage.id}
                      stage={stage}
                      menuOpen={menuId === stage.id}
                      onMenu={() => setMenuId(menuId === stage.id ? null : stage.id)}
                      onEdit={() => {
                        setMenuId(null);
                        setEditing(stage);
                      }}
                      onDelete={() => {
                        setMenuId(null);
                        setDeleting(stage);
                      }}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar etapa
          </Button>
          <div className="flex justify-end">
            <Button type="button" onClick={() => onOpenChange(false)}>
              Concluído
            </Button>
          </div>
        </div>
      </Dialog>
      <StageFormDialog
        open={creating}
        title="Nova etapa"
        pending={pending}
        existingNames={stages.map((stage) => stage.name)}
        onOpenChange={setCreating}
        onSubmit={(draft) => save(draft)}
      />
      <StageFormDialog
        open={Boolean(editing)}
        title="Editar etapa"
        initial={editing}
        pending={pending}
        existingNames={stages
          .filter((stage) => stage.id !== editing?.id)
          .map((stage) => stage.name)}
        onOpenChange={(value) => {
          if (!value) setEditing(null);
        }}
        onSubmit={(draft) => save(draft, editing)}
      />
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(value) => {
          if (!value) setDeleting(null);
        }}
        title="Excluir etapa"
        description={deleting?.name}
      >
        <div className="space-y-4">
          {(deleting?._count?.deals ?? 0) > 0 ? (
            <>
              <p className="text-sm">
                Esta etapa possui {deleting?._count?.deals} negócio(s). Escolha para onde movê-los
                antes de excluir.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="delete-stage-target">Etapa de destino</Label>
                <select
                  id="delete-stage-target"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={targetStageId}
                  onChange={(event) => setTargetStageId(event.target.value)}
                >
                  <option value="">Selecione…</option>
                  {stages
                    .filter((stage) => stage.id !== deleting?.id)
                    .map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                </select>
              </div>
            </>
          ) : (
            <p className="text-sm">A etapa está vazia. Esta ação não pode ser desfeita.</p>
          )}
          {stages.length <= 1 ? (
            <p role="alert" className="text-sm text-destructive">
              O pipeline precisa manter pelo menos uma etapa.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={pending} onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={
                pending ||
                stages.length <= 1 ||
                ((deleting?._count?.deals ?? 0) > 0 && !targetStageId)
              }
              onClick={() => void remove()}
            >
              {pending ? "Excluindo…" : "Excluir etapa"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
