"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contactsApi, dealsApi, pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Deal, Pipeline, PipelineStage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";

export function sortPipelineStages(stages: PipelineStage[] = []) {
  return stages
    .slice()
    .sort(
      (left, right) => (left.position ?? left.order ?? 0) - (right.position ?? right.order ?? 0),
    );
}

function initialStage(stages: PipelineStage[] = []) {
  const ordered = sortPipelineStages(stages);
  return ordered.find((stage) => stage.isInitial) ?? ordered[0];
}

export function CreateDealDialog({
  open,
  onOpenChange,
  pipeline,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");
  const [contactId, setContactId] = React.useState("");
  const [ownerId, setOwnerId] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const stage = initialStage(pipeline.stages);

  const contacts = useQuery({
    queryKey: queryKeys.contacts.list({ pageSize: 100, source: "deal-dialog" }),
    queryFn: () => contactsApi.list({ pageSize: 100, sortBy: "firstName" }),
    enabled: open,
    retry: false,
  });
  const users = useQuery({
    queryKey: queryKeys.pipelines.eligibleUsers(pipeline.id),
    queryFn: () => pipelinesApi.eligibleUsers(pipeline.id),
    enabled: open,
    retry: false,
  });

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setValue("");
    setContactId("");
    setOwnerId(pipeline.defaultOwnerId ?? "");
    setFormError("");
  }, [open, pipeline.defaultOwnerId]);

  const mutation = useMutation({
    mutationFn: ({
      normalizedName,
      normalizedValue,
    }: {
      normalizedName: string;
      normalizedValue: number;
    }) =>
      dealsApi.create({
        name: normalizedName,
        value: normalizedValue,
        pipelineId: pipeline.id,
        stageId: stage!.id,
        contactId: contactId || undefined,
        ownerId: ownerId || undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.pipelines.board(pipeline.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
      ]);
      toast.success("Card criado");
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

    const normalizedName = name.trim();
    const normalizedValue = Number(value);
    if (!normalizedName) {
      setFormError("Informe o nome do card.");
      return;
    }
    if (value.trim() === "" || !Number.isFinite(normalizedValue) || normalizedValue < 0) {
      setFormError("Informe um valor válido.");
      return;
    }
    if (!stage) {
      setFormError("Este pipeline não possui uma etapa inicial disponível.");
      return;
    }

    mutation.mutate({ normalizedName, normalizedValue });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Criar card"
      description={`O card será criado em ${stage?.name ?? "uma etapa inicial"}.`}
    >
      <form className="space-y-4" onSubmit={submit}>
        <div className="space-y-1">
          <Label htmlFor="deal-card-name">Nome</Label>
          <Input
            id="deal-card-name"
            autoFocus
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Nova oportunidade"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="deal-card-value">Valor</Label>
          <Input
            id="deal-card-value"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="deal-card-contact">Contato (opcional)</Label>
            <Select
              id="deal-card-contact"
              value={contactId}
              onChange={(event) => setContactId(event.target.value)}
            >
              <option value="">Sem contato</option>
              {contacts.data?.data.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="deal-card-owner">Responsável (opcional)</Label>
            <Select
              id="deal-card-owner"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
            >
              <option value="">Responsável atual</option>
              {users.data?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {contacts.error || users.error ? (
          <p className="text-xs text-muted-foreground">
            Contatos ou responsáveis não puderam ser carregados. O card ainda pode ser criado sem
            esses vínculos.
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
          <Button type="submit" disabled={!stage || mutation.isPending}>
            {mutation.isPending ? "Criando…" : "Criar card"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function MoveDealDialog({
  deal,
  pipeline,
  onOpenChange,
  onMoved,
}: {
  deal: Deal | null;
  pipeline: Pipeline;
  onOpenChange: (open: boolean) => void;
  onMoved: (deal: Deal, targetPipelineId: string, targetStageId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [pipelineId, setPipelineId] = React.useState(pipeline.id);
  const [stageId, setStageId] = React.useState("");
  const [formError, setFormError] = React.useState("");
  const open = Boolean(deal);

  const pipelines = useQuery({
    queryKey: queryKeys.pipelines.list({
      pageSize: 100,
      archived: false,
      source: "move-deal",
    }),
    queryFn: () => pipelinesApi.list({ pageSize: 100, archived: false }),
    enabled: open,
    retry: false,
  });
  const targetBoard = useQuery({
    queryKey: queryKeys.pipelines.board(pipelineId),
    queryFn: () => pipelinesApi.board(pipelineId),
    enabled: open && pipelineId !== pipeline.id,
    retry: false,
  });

  const selectedPipeline = pipelineId === pipeline.id ? pipeline : targetBoard.data;
  const stages = sortPipelineStages(selectedPipeline?.stages);

  React.useEffect(() => {
    if (!deal) return;
    setPipelineId(deal.pipelineId);
    setStageId(deal.stageId);
    setFormError("");
  }, [deal]);

  React.useEffect(() => {
    if (!open || !selectedPipeline || stages.length === 0) return;
    if (!stages.some((stage) => stage.id === stageId)) {
      setStageId(initialStage(stages)?.id ?? "");
    }
  }, [open, selectedPipeline, stageId, stages]);

  const mutation = useMutation({
    mutationFn: () =>
      dealsApi.update(deal!.id, {
        pipelineId,
        stageId,
      }),
    onSuccess: async (updatedDeal) => {
      onMoved(deal!, pipelineId, stageId);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.pipelines.board(pipeline.id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.pipelines.board(pipelineId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deals.detail(deal!.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
      ]);
      queryClient.setQueryData(queryKeys.deals.detail(deal!.id), updatedDeal);
      toast.success(
        pipelineId === pipeline.id
          ? "Card movido para outra etapa"
          : "Card movido para outro pipeline",
      );
      onOpenChange(false);
    },
    onError: (error: Error) => {
      setFormError(error.message);
      toast.error(error.message);
    },
  });

  const pipelineOptions = pipelines.data?.data ?? [];
  const currentPipelineIsListed = pipelineOptions.some((item) => item.id === pipeline.id);
  const targetLoading = pipelineId !== pipeline.id && targetBoard.isLoading;
  const unchanged = deal?.pipelineId === pipelineId && deal?.stageId === stageId;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mover card"
      description="Escolha o pipeline e a etapa de destino."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!deal || !pipelineId || !stageId || unchanged) return;
          setFormError("");
          mutation.mutate();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="move-deal-pipeline">Pipeline</Label>
          <Select
            id="move-deal-pipeline"
            value={pipelineId}
            onChange={(event) => {
              setPipelineId(event.target.value);
              setStageId("");
              setFormError("");
            }}
          >
            {!currentPipelineIsListed ? <option value={pipeline.id}>{pipeline.name}</option> : null}
            {pipelineOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="move-deal-stage">Etapa</Label>
          <Select
            id="move-deal-stage"
            value={stageId}
            disabled={targetLoading || targetBoard.isError}
            onChange={(event) => {
              setStageId(event.target.value);
              setFormError("");
            }}
          >
            {targetLoading ? <option value="">Carregando etapas…</option> : null}
            {!targetLoading && stages.length === 0 ? (
              <option value="">Nenhuma etapa disponível</option>
            ) : null}
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </Select>
        </div>

        {pipelines.error || targetBoard.error ? (
          <p role="alert" className="text-sm text-destructive">
            Não foi possível carregar os destinos disponíveis.
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
              targetLoading ||
              !stageId ||
              unchanged ||
              Boolean(targetBoard.error)
            }
          >
            {mutation.isPending ? "Movendo…" : "Mover card"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
