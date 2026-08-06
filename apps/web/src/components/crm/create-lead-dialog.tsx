"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contactsApi, dealsApi, pipelinesApi, settingsApi } from "@/lib/api";
import { BETA_PIPELINE_ID } from "@/lib/beta-config";
import { queryKeys } from "@/lib/query-keys";
import type { Deal, PipelineStage } from "@/lib/types";
import { sortPipelineStages } from "@/components/crm/deal-board-dialogs";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/stores/ui";

function initialStage(stages: PipelineStage[] = []) {
  const ordered = sortPipelineStages(stages);
  return ordered.find((stage) => stage.isInitial) ?? ordered[0];
}

export function CreateLeadDialog({
  open,
  onOpenChange,
  pipelineId = BETA_PIPELINE_ID,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Reserved for multi-pipeline evolution; beta defaults to BETA_PIPELINE_ID. */
  pipelineId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const openDealDrawer = useUiStore((state) => state.openDealDrawer);

  const [name, setName] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [value, setValue] = React.useState("0");
  const [ownerId, setOwnerId] = React.useState("");
  const [formError, setFormError] = React.useState("");

  const boardQuery = useQuery({
    queryKey: queryKeys.pipelines.board(pipelineId),
    queryFn: () => pipelinesApi.board(pipelineId),
    enabled: open,
    retry: false,
  });

  const users = useQuery({
    queryKey: [...queryKeys.settings, "create-lead-users"],
    queryFn: () => settingsApi.users(),
    enabled: open,
    retry: false,
  });

  const stage = initialStage(boardQuery.data?.stages);
  const resolvedPipelineId = boardQuery.data?.id ?? pipelineId;

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setValue("0");
    setOwnerId(boardQuery.data?.defaultOwnerId ?? "");
    setFormError("");
  }, [open, boardQuery.data?.defaultOwnerId]);

  const mutation = useMutation({
    mutationFn: async (): Promise<Deal> => {
      if (!stage) {
        throw new Error("Este pipeline não possui uma etapa inicial disponível.");
      }

      const normalizedName = name.trim();
      const normalizedValue = Number(value);
      let contactId: string | undefined;

      const trimmedContact = contactName.trim();
      const trimmedPhone = phone.trim();
      const trimmedEmail = email.trim();

      if (trimmedContact || trimmedPhone || trimmedEmail) {
        const [firstName, ...rest] = (trimmedContact || normalizedName).split(
          /\s+/,
        );
        const contact = await contactsApi.create({
          firstName: firstName || normalizedName,
          lastName: rest.length ? rest.join(" ") : undefined,
          phone: trimmedPhone || undefined,
          whatsapp: trimmedPhone || undefined,
          email: trimmedEmail || undefined,
          ownerId: ownerId || undefined,
        });
        contactId = contact.id;
      }

      return dealsApi.create({
        name: normalizedName,
        value: normalizedValue,
        pipelineId: resolvedPipelineId,
        stageId: stage.id,
        contactId,
        ownerId: ownerId || undefined,
      });
    },
    onSuccess: async (deal) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.pipelines.board(resolvedPipelineId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all }),
      ]);
      toast.success("Lead criado com sucesso.");
      onOpenChange(false);

      const params = new URLSearchParams(searchParams.toString());
      params.set("view", "kanban");
      params.set("deal", deal.id);
      params.delete("conversation");
      params.delete("pipeline");
      router.replace(`/operacao?${params.toString()}`, { scroll: false });
      openDealDrawer(deal.id);
    },
    onError: (error: Error) => {
      const message =
        error.message?.trim() ||
        "Não foi possível criar o lead. Tente novamente.";
      setFormError(message);
      toast.error(
        message.includes("Não foi possível")
          ? message
          : "Não foi possível criar o lead. Tente novamente.",
      );
    },
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    setFormError("");

    const normalizedName = name.trim();
    const normalizedValue = Number(value);
    if (!normalizedName) {
      setFormError("Informe o nome do lead.");
      return;
    }
    if (value.trim() === "" || !Number.isFinite(normalizedValue) || normalizedValue < 0) {
      setFormError("Informe um valor válido.");
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Informe um e-mail válido.");
      return;
    }
    if (!stage) {
      setFormError("Este pipeline não possui uma etapa inicial disponível.");
      return;
    }

    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Novo lead"
      description={
        stage
          ? `O lead será criado em ${stage.name}.`
          : "Carregando etapa inicial…"
      }
    >
      <form
        className="space-y-4"
        onSubmit={submit}
        data-testid="create-lead-form"
      >
        <div className="space-y-1">
          <Label htmlFor="create-lead-name">Nome do lead</Label>
          <Input
            id="create-lead-name"
            autoFocus
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Lead WhatsApp — Maria"
            disabled={mutation.isPending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="create-lead-contact">Nome do contato (opcional)</Label>
          <Input
            id="create-lead-contact"
            maxLength={200}
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            placeholder="Ex.: Maria Silva"
            disabled={mutation.isPending}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="create-lead-phone">Telefone / WhatsApp</Label>
            <Input
              id="create-lead-phone"
              maxLength={40}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Ex.: 34999990000"
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-lead-email">E-mail (opcional)</Label>
            <Input
              id="create-lead-email"
              type="email"
              maxLength={200}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="maria@email.com"
              disabled={mutation.isPending}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="create-lead-value">Valor</Label>
            <Input
              id="create-lead-value"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="0,00"
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-lead-owner">Responsável (opcional)</Label>
            <Select
              id="create-lead-owner"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
              disabled={mutation.isPending}
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

        {boardQuery.error ? (
          <p role="alert" className="text-sm text-destructive">
            {(boardQuery.error as Error).message ||
              "Não foi possível carregar o pipeline."}
          </p>
        ) : null}
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!stage || mutation.isPending || boardQuery.isLoading}
          >
            {mutation.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
