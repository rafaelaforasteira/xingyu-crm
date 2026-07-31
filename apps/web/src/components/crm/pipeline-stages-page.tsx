"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Clock3,
  Pencil,
  Plus,
  Trash2,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  pipelineStagesApi,
  pipelinesApi,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  PipelineStage,
  PipelineStageInput,
  PipelineStageType,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Label, Select } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBanner, PageHeader } from "@/components/crm/page-header";

const TYPE_LABELS: Record<PipelineStageType, string> = {
  OPEN: "Em aberto",
  WON: "Ganha",
  LOST: "Perdida",
};

const DEFAULT_COLOR = "#7c3aed";

interface StageDraft {
  name: string;
  description: string;
  color: string;
  type: PipelineStageType;
  isInitial: boolean;
  probability: string;
  maxDurationMinutes: string;
}

function draftFromStage(stage: PipelineStage | null): StageDraft {
  return {
    name: stage?.name ?? "",
    description: stage?.description ?? "",
    color: stage?.color ?? DEFAULT_COLOR,
    type: stage?.type ?? "OPEN",
    isInitial: stage?.isInitial ?? false,
    probability:
      stage?.probability === null || stage?.probability === undefined
        ? ""
        : String(stage.probability),
    maxDurationMinutes:
      stage?.maxDurationMinutes === null ||
      stage?.maxDurationMinutes === undefined
        ? ""
        : String(stage.maxDurationMinutes),
  };
}

function optionalInteger(value: string) {
  if (!value.trim()) return undefined;
  return Number.parseInt(value, 10);
}

function toStageInput(draft: StageDraft): PipelineStageInput {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || undefined,
    color: draft.color,
    type: draft.type,
    isInitial: draft.type === "OPEN" && draft.isInitial,
    probability: optionalInteger(draft.probability),
    maxDurationMinutes: optionalInteger(draft.maxDurationMinutes),
  };
}

function formatDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined) return "Sem prazo";
  if (minutes === 0) return "Sem prazo";
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? "dia" : "dias"}`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "hora" : "horas"}`;
  }
  return `${minutes} minutos`;
}

function StageFormDialog({
  open,
  stage,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  stage: PipelineStage | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PipelineStageInput) => void;
}) {
  const [draft, setDraft] = React.useState<StageDraft>(() =>
    draftFromStage(stage),
  );

  React.useEffect(() => {
    if (open) setDraft(draftFromStage(stage));
  }, [open, stage]);

  const setField = <K extends keyof StageDraft>(
    field: K,
    value: StageDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={stage ? "Editar etapa" : "Criar etapa"}
      description="Defina como esta etapa se comporta no pipeline."
      wide
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(toStageInput(draft));
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="stage-name">Nome</Label>
            <Input
              id="stage-name"
              required
              maxLength={120}
              autoFocus
              value={draft.name}
              onChange={(event) => setField("name", event.target.value)}
            />
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="stage-description">Descrição</Label>
            <Textarea
              id="stage-description"
              maxLength={500}
              rows={3}
              value={draft.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="stage-type">Tipo</Label>
            <Select
              id="stage-type"
              value={draft.type}
              onChange={(event) => {
                const type = event.target.value as PipelineStageType;
                setDraft((current) => ({
                  ...current,
                  type,
                  isInitial: type === "OPEN" ? current.isInitial : false,
                }));
              }}
            >
              <option value="OPEN">Em aberto</option>
              <option value="WON">Ganha</option>
              <option value="LOST">Perdida</option>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="stage-color">Cor</Label>
            <div className="flex gap-2">
              <Input
                id="stage-color"
                type="color"
                className="w-14 shrink-0 cursor-pointer px-1"
                value={draft.color}
                onChange={(event) => setField("color", event.target.value)}
              />
              <Input
                aria-label="Código da cor"
                maxLength={32}
                value={draft.color}
                onChange={(event) => setField("color", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="stage-probability">Probabilidade (%)</Label>
            <Input
              id="stage-probability"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              step={1}
              placeholder="Opcional"
              value={draft.probability}
              onChange={(event) => setField("probability", event.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="stage-duration">Prazo máximo (minutos)</Label>
            <Input
              id="stage-duration"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="Opcional"
              value={draft.maxDurationMinutes}
              onChange={(event) =>
                setField("maxDurationMinutes", event.target.value)
              }
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            checked={draft.isInitial}
            disabled={draft.type !== "OPEN"}
            onChange={(event) => setField("isInitial", event.target.checked)}
          />
          <span>
            <span className="block font-medium">Etapa inicial</span>
            <span className="block text-xs text-muted-foreground">
              Novos negócios entram automaticamente nesta etapa.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || !draft.name.trim()}>
            {pending
              ? "Salvando…"
              : stage
                ? "Salvar alterações"
                : "Criar etapa"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function StageCard({
  stage,
  index,
  total,
  pending,
  onEdit,
  onMove,
  onArchive,
  onDelete,
}: {
  stage: PipelineStage;
  index: number;
  total: number;
  pending: boolean;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const type = stage.type ?? (stage.isWon ? "WON" : stage.isLost ? "LOST" : "OPEN");
  const dealsCount = stage._count?.deals ?? stage.deals?.length ?? 0;

  return (
    <Card data-testid="stage-card" data-stage-id={stage.id}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 h-9 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: stage.color ?? DEFAULT_COLOR }}
          />
          <div className="min-w-0">
            <CardTitle className="truncate">{stage.name}</CardTitle>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge
                variant={
                  type === "WON"
                    ? "success"
                    : type === "LOST"
                      ? "destructive"
                      : "secondary"
                }
              >
                {TYPE_LABELS[type]}
              </Badge>
              {stage.isInitial ? <Badge variant="outline">Inicial</Badge> : null}
              <Badge variant="outline">{dealsCount} negócios</Badge>
            </div>
          </div>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          #{index + 1}
        </span>
      </CardHeader>
      <CardContent>
        <p className="min-h-10 text-sm text-muted-foreground">
          {stage.description || "Sem descrição."}
        </p>
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            <dt className="sr-only">Prazo</dt>
            <dd>{formatDuration(stage.maxDurationMinutes)}</dd>
          </div>
          <div>
            <dt className="inline">Probabilidade: </dt>
            <dd className="inline">
              {stage.probability === null || stage.probability === undefined
                ? "não definida"
                : `${stage.probability}%`}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Mover ${stage.name} para cima`}
              disabled={pending || index === 0}
              onClick={() => onMove(-1)}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Mover ${stage.name} para baixo`}
              disabled={pending || index === total - 1}
              onClick={() => onMove(1)}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Arquivar ${stage.name}`}
              title={
                dealsCount
                  ? "Mova os negócios antes de arquivar esta etapa"
                  : "Arquivar etapa"
              }
              disabled={pending || dealsCount > 0}
              onClick={onArchive}
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Excluir ${stage.name}`}
              disabled={pending}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PipelineStagesPage({ pipelineId }: { pipelineId: string }) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingStage, setEditingStage] = React.useState<PipelineStage | null>(
    null,
  );
  const [stageToDelete, setStageToDelete] =
    React.useState<PipelineStage | null>(null);
  const [needsTarget, setNeedsTarget] = React.useState(false);
  const [targetStageId, setTargetStageId] = React.useState("");

  const pipeline = useQuery({
    queryKey: queryKeys.pipelines.detail(pipelineId),
    queryFn: () => pipelinesApi.get(pipelineId),
    retry: false,
  });
  const stages = useQuery({
    queryKey: queryKeys.pipelines.stages(pipelineId),
    queryFn: () => pipelineStagesApi.list(pipelineId),
    retry: false,
  });

  const invalidatePipeline = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.stages(pipelineId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.detail(pipelineId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.board(pipelineId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
    ]);
  }, [pipelineId, queryClient]);

  const saveMutation = useMutation({
    mutationFn: ({
      stage,
      data,
    }: {
      stage: PipelineStage | null;
      data: PipelineStageInput;
    }) =>
      stage
        ? pipelineStagesApi.update(pipelineId, stage.id, data)
        : pipelineStagesApi.create(pipelineId, data),
    onSuccess: async (_, variables) => {
      await invalidatePipeline();
      toast.success(variables.stage ? "Etapa atualizada" : "Etapa criada");
      setFormOpen(false);
      setEditingStage(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorderMutation = useMutation({
    mutationFn: (stageIds: string[]) =>
      pipelineStagesApi.reorder(pipelineId, stageIds),
    onSuccess: async (updatedStages) => {
      queryClient.setQueryData(
        queryKeys.pipelines.stages(pipelineId),
        updatedStages,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pipelines.board(pipelineId),
      });
      toast.success("Ordem das etapas atualizada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (stage: PipelineStage) =>
      pipelineStagesApi.update(pipelineId, stage.id, { archived: true }),
    onSuccess: async () => {
      await invalidatePipeline();
      toast.success("Etapa arquivada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: ({
      stageId,
      destinationId,
    }: {
      stageId: string;
      destinationId?: string;
    }) => pipelineStagesApi.remove(pipelineId, stageId, destinationId),
    onSuccess: async () => {
      await invalidatePipeline();
      toast.success(
        targetStageId
          ? "Negócios movidos e etapa excluída"
          : "Etapa excluída",
      );
      setStageToDelete(null);
      setNeedsTarget(false);
      setTargetStageId("");
    },
    onError: (error: Error) => {
      if (error instanceof ApiError && error.status === 409 && !needsTarget) {
        setNeedsTarget(true);
        toast.info("Selecione uma etapa de destino para os negócios");
        return;
      }
      toast.error(error.message);
    },
  });

  const orderedStages = React.useMemo(
    () =>
      [...(stages.data ?? [])].sort(
        (left, right) =>
          (left.position ?? left.order ?? 0) -
          (right.position ?? right.order ?? 0),
      ),
    [stages.data],
  );

  const moveStage = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= orderedStages.length) return;
    const next = orderedStages.map((stage) => stage.id);
    const currentId = next[index]!;
    next[index] = next[destination]!;
    next[destination] = currentId;
    reorderMutation.mutate(next);
  };

  const mutationPending =
    saveMutation.isPending ||
    reorderMutation.isPending ||
    archiveMutation.isPending ||
    deleteMutation.isPending;

  const openCreate = () => {
    setEditingStage(null);
    setFormOpen(true);
  };

  const closeDelete = () => {
    if (deleteMutation.isPending) return;
    setStageToDelete(null);
    setNeedsTarget(false);
    setTargetStageId("");
  };

  return (
    <div>
      <PageHeader
        title="Etapas do pipeline"
        description={
          pipeline.data
            ? `Configure a jornada de “${pipeline.data.name}”.`
            : "Configure a jornada e as regras do pipeline."
        }
        actions={
          <>
            <Link
              href={`/pipelines/${pipelineId}`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3.5 text-sm font-medium hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao quadro
            </Link>
            <Link
              href={`/pipelines/${pipelineId}/channels`}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-input bg-card px-3.5 text-sm font-medium hover:bg-accent"
            >
              <Wifi className="h-4 w-4" />
              Canais
            </Link>
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Criar etapa
            </Button>
          </>
        }
      />

      {pipeline.error ? (
        <ErrorBanner message={(pipeline.error as Error).message} />
      ) : null}
      {stages.error ? (
        <ErrorBanner message={(stages.error as Error).message} />
      ) : null}

      {stages.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full" />
          ))}
        </div>
      ) : null}

      {!stages.isLoading && orderedStages.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="Nenhuma etapa ativa"
          description="Crie a primeira etapa para começar a organizar os negócios."
          actionLabel="Criar etapa"
          onAction={openCreate}
        />
      ) : null}

      {orderedStages.length ? (
        <>
          <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            Use as setas para alterar a ordem. Cada mudança é salva imediatamente.
          </div>
          <div
            data-testid="stages-list"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {orderedStages.map((stage, index) => (
              <StageCard
                key={stage.id}
                stage={stage}
                index={index}
                total={orderedStages.length}
                pending={mutationPending}
                onEdit={() => {
                  setEditingStage(stage);
                  setFormOpen(true);
                }}
                onMove={(direction) => moveStage(index, direction)}
                onArchive={() => archiveMutation.mutate(stage)}
                onDelete={() => {
                  setStageToDelete(stage);
                  setNeedsTarget(false);
                  setTargetStageId("");
                }}
              />
            ))}
          </div>
        </>
      ) : null}

      <StageFormDialog
        open={formOpen}
        stage={editingStage}
        pending={saveMutation.isPending}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingStage(null);
        }}
        onSubmit={(data) =>
          saveMutation.mutate({ stage: editingStage, data })
        }
      />

      <Dialog
        open={Boolean(stageToDelete)}
        onOpenChange={(open) => {
          if (!open) closeDelete();
        }}
        title="Excluir etapa"
        description="Esta ação remove a etapa do pipeline."
      >
        <div className="space-y-4">
          {!needsTarget ? (
            <p className="text-sm text-muted-foreground">
              Confirme a exclusão de{" "}
              <strong className="text-foreground">{stageToDelete?.name}</strong>.
              Se houver negócios nesta etapa, você poderá escolher o destino antes
              de concluir.
            </p>
          ) : (
            <>
              <div
                role="alert"
                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                Esta etapa possui negócios. Selecione outra etapa para movê-los
                antes da exclusão.
              </div>
              <div className="space-y-1">
                <Label htmlFor="target-stage">Etapa de destino</Label>
                <Select
                  id="target-stage"
                  value={targetStageId}
                  onChange={(event) => setTargetStageId(event.target.value)}
                >
                  <option value="">Selecione uma etapa</option>
                  {orderedStages
                    .filter((stage) => stage.id !== stageToDelete?.id)
                    .map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                </Select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeDelete}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !stageToDelete ||
                deleteMutation.isPending ||
                (needsTarget && !targetStageId)
              }
              onClick={() => {
                if (!stageToDelete) return;
                deleteMutation.mutate({
                  stageId: stageToDelete.id,
                  destinationId: needsTarget ? targetStageId : undefined,
                });
              }}
            >
              {deleteMutation.isPending
                ? "Excluindo…"
                : needsTarget
                  ? "Mover e excluir"
                  : "Excluir etapa"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
