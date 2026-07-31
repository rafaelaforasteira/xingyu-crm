"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { pipelinesApi, settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type {
  CreateLifecycleOpportunityInput,
  LifecycleOpportunityResult,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { sortPipelineStages } from "@/components/crm/deal-board-dialogs";

function initialStageId(stages: ReturnType<typeof sortPipelineStages>) {
  const initial = stages.find((stage) => stage.isInitial) ?? stages[0];
  return initial?.id ?? "";
}

function dateInputToIso(value: string) {
  if (!value) return undefined;
  return `${value}T12:00:00.000Z`;
}

export function CreateOpportunityDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  defaultOwnerId,
  createOpportunity,
  invalidateKeys = ["reactivation"],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  defaultOwnerId?: string | null;
  createOpportunity: (
    contactId: string,
    data: CreateLifecycleOpportunityInput,
  ) => Promise<LifecycleOpportunityResult>;
  invalidateKeys?: Array<"reactivation" | "repurchase">;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pipelineId, setPipelineId] = React.useState("");
  const [stageId, setStageId] = React.useState("");
  const [ownerId, setOwnerId] = React.useState("");
  const [createConversation, setCreateConversation] = React.useState(false);
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDueAt, setTaskDueAt] = React.useState("");
  const [formError, setFormError] = React.useState("");

  const pipelines = useQuery({
    queryKey: queryKeys.pipelines.list({
      pageSize: 100,
      archived: false,
      source: "create-opportunity",
    }),
    queryFn: () => pipelinesApi.list({ pageSize: 100, archived: false }),
    enabled: open,
    retry: false,
  });
  const pipelineDetail = useQuery({
    queryKey: queryKeys.pipelines.detail(pipelineId),
    queryFn: () => pipelinesApi.get(pipelineId),
    enabled: open && Boolean(pipelineId),
    retry: false,
  });
  const users = useQuery({
    queryKey: [...queryKeys.settings, "create-opportunity-users"],
    queryFn: () => settingsApi.users(),
    enabled: open,
    retry: false,
  });

  const stages = sortPipelineStages(pipelineDetail.data?.stages ?? []);

  React.useEffect(() => {
    if (!open) return;
    setPipelineId("");
    setStageId("");
    setOwnerId(defaultOwnerId ?? "");
    setCreateConversation(false);
    setTaskTitle("");
    setTaskDueAt("");
    setFormError("");
  }, [open, defaultOwnerId, contactId]);

  React.useEffect(() => {
    if (!open || !pipelineId || stages.length === 0) return;
    if (!stages.some((stage) => stage.id === stageId)) {
      setStageId(initialStageId(stages));
    }
  }, [open, pipelineId, stageId, stages]);

  const mutation = useMutation({
    mutationFn: (payload: CreateLifecycleOpportunityInput) =>
      createOpportunity(contactId, payload),
    onSuccess: async (result) => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.pipelines.board(result.deal.pipelineId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deals.detail(result.deal.id),
        }),
      ];
      for (const key of invalidateKeys) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: [key] }),
        );
      }
      await Promise.all(invalidations);

      const dealHref = `/pipelines/${result.deal.pipelineId}/deals/${result.deal.id}`;
      toast.success("Oportunidade criada", {
        description: result.deal.name,
        action: {
          label: "Abrir negócio",
          onClick: () => router.push(dealHref),
        },
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setFormError(error.message);
      toast.error(error.message);
    },
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    if (!pipelineId) {
      setFormError("Selecione um pipeline.");
      return;
    }
    if (!stageId) {
      setFormError("Selecione uma etapa.");
      return;
    }

    const trimmedTaskTitle = taskTitle.trim();
    const payload: CreateLifecycleOpportunityInput = {
      pipelineId,
      stageId,
      ownerId: ownerId || undefined,
      createConversation: createConversation || undefined,
    };

    if (trimmedTaskTitle) {
      payload.task = {
        title: trimmedTaskTitle,
        dueAt: dateInputToIso(taskDueAt),
      };
    }

    mutation.mutate(payload);
  };

  const pipelineOptions = pipelines.data?.data ?? [];
  const stagesLoading = Boolean(pipelineId) && pipelineDetail.isLoading;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Criar oportunidade"
      description={`Converter ${contactName} em um negócio no pipeline selecionado.`}
      wide
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="create-opportunity-pipeline">Pipeline</Label>
            <Select
              id="create-opportunity-pipeline"
              value={pipelineId}
              disabled={pipelines.isLoading}
              onChange={(event) => {
                setPipelineId(event.target.value);
                setStageId("");
                setFormError("");
              }}
            >
              <option value="">
                {pipelines.isLoading ? "Carregando pipelines…" : "Selecione um pipeline"}
              </option>
              {pipelineOptions.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-opportunity-stage">Etapa</Label>
            <Select
              id="create-opportunity-stage"
              value={stageId}
              disabled={!pipelineId || stagesLoading || pipelineDetail.isError}
              onChange={(event) => {
                setStageId(event.target.value);
                setFormError("");
              }}
            >
              {!pipelineId ? <option value="">Selecione um pipeline primeiro</option> : null}
              {pipelineId && stagesLoading ? (
                <option value="">Carregando etapas…</option>
              ) : null}
              {pipelineId && !stagesLoading && stages.length === 0 ? (
                <option value="">Nenhuma etapa disponível</option>
              ) : null}
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="create-opportunity-owner">Responsável (opcional)</Label>
          <Select
            id="create-opportunity-owner"
            value={ownerId}
            disabled={users.isLoading}
            onChange={(event) => setOwnerId(event.target.value)}
          >
            <option value="">Responsável padrão do contato</option>
            {(users.data ?? []).map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <input
            id="create-opportunity-conversation"
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={createConversation}
            onChange={(event) => setCreateConversation(event.target.checked)}
          />
          Criar conversa vinculada ao negócio
        </label>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Tarefa de follow-up (opcional)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="create-opportunity-task-title">Título da tarefa</Label>
              <Input
                id="create-opportunity-task-title"
                maxLength={200}
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Ex.: Ligar para retomar contato"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-opportunity-task-due">Vencimento</Label>
              <Input
                id="create-opportunity-task-due"
                type="date"
                value={taskDueAt}
                disabled={!taskTitle.trim()}
                onChange={(event) => setTaskDueAt(event.target.value)}
              />
            </div>
          </div>
        </div>

        {pipelines.error || pipelineDetail.error ? (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível carregar pipelines ou etapas.
          </p>
        ) : null}
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              mutation.isPending ||
              !pipelineId ||
              !stageId ||
              stagesLoading ||
              Boolean(pipelineDetail.error)
            }
          >
            {mutation.isPending ? "Criando…" : "Criar oportunidade"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
