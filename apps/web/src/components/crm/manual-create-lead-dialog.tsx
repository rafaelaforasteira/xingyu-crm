"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { dealsApi, settingsApi } from "@/lib/api";
import { formatPhoneForDisplay, normalizePhoneForLookup } from "@/lib/format-phone-display";
import { formatLeadCode } from "@/components/crm/conversation/conversation-list-utils";
import { queryKeys } from "@/lib/query-keys";
import type { Pipeline } from "@/lib/types";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUiStore } from "@/stores/ui";

const SOURCES = ["Indicação", "Evento", "Ligação", "Loja física", "Outro"];

export function ManualCreateLeadDialog({
  open,
  onOpenChange,
  pipeline,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const openDealDrawer = useUiStore((state) => state.openDealDrawer);
  const orderedStages = React.useMemo(
    () => [...(pipeline.stages ?? [])].sort((a, b) => a.position - b.position),
    [pipeline.stages],
  );
  const defaultStage = orderedStages.find((stage) => stage.isInitial) ?? orderedStages[0];
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [stageId, setStageId] = React.useState("");
  const [ownerId, setOwnerId] = React.useState("");
  const [value, setValue] = React.useState("");
  const [source, setSource] = React.useState("");
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDueAt, setTaskDueAt] = React.useState("");
  const [debouncedPhone, setDebouncedPhone] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setPhone("");
    setName("");
    setEmail("");
    setValue("");
    setSource("");
    setNote("");
    setTaskTitle("");
    setTaskDueAt("");
    setNoteOpen(false);
    setTaskOpen(false);
    setError("");
    setStageId(defaultStage?.id ?? "");
    setOwnerId(pipeline.defaultOwnerId ?? user?.id ?? "");
  }, [defaultStage?.id, open, pipeline.defaultOwnerId, user?.id]);
  React.useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedPhone(normalizePhoneForLookup(phone) ?? ""),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [phone]);

  const lookup = useQuery({
    queryKey: [
      ...queryKeys.contacts.all,
      "manual-lead-lookup",
      pipeline.id,
      debouncedPhone,
      email.trim().toLowerCase(),
    ],
    queryFn: () =>
      dealsApi.lookupManualLead({
        pipelineId: pipeline.id,
        phone: debouncedPhone,
        email: email.trim() || undefined,
      }),
    enabled: open && Boolean(debouncedPhone),
    staleTime: 10_000,
    retry: false,
  });
  React.useEffect(() => {
    if (!lookup.data?.contact) return;
    setName(lookup.data.contact.name);
    setEmail(lookup.data.contact.email ?? "");
  }, [lookup.data?.contact]);
  const users = useQuery({
    queryKey: [...queryKeys.settings, "create-lead-users"],
    queryFn: () => settingsApi.users(),
    enabled: open,
    retry: false,
  });
  const activeDeal = lookup.data?.activeDeal;

  const openExisting = () => {
    if (!activeDeal) return;
    onOpenChange(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "kanban");
    params.set("deal", activeDeal.id);
    params.delete("conversation");
    params.delete("pipeline");
    router.replace(`/operacao?${params.toString()}`, { scroll: false });
    openDealDrawer(activeDeal.id);
  };
  const mutation = useMutation({
    mutationFn: () =>
      dealsApi.createManualLead({
        phone,
        contactName: name.trim(),
        email: email.trim() || undefined,
        pipelineId: pipeline.id,
        stageId,
        ownerId: ownerId || undefined,
        value: value.trim() ? Number(value) : undefined,
        informedSource: source || undefined,
        note: note.trim() || undefined,
        taskTitle: taskTitle.trim() || undefined,
        taskDueAt: taskDueAt || undefined,
      }),
    onSuccess: async (deal) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.board(pipeline.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all }),
      ]);
      toast.success(`${formatLeadCode(deal.leadSequence) ?? "Lead"} criado com sucesso.`);
      onOpenChange(false);
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", "kanban");
      params.set("deal", deal.id);
      params.delete("conversation");
      params.delete("pipeline");
      router.replace(`/operacao?${params.toString()}`, { scroll: false });
      openDealDrawer(deal.id);
    },
    onError: (reason: Error) => {
      setError(reason.message);
      toast.error(reason.message);
      void lookup.refetch();
    },
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!normalizePhoneForLookup(phone)) return setError("Informe um telefone válido.");
    if (!name.trim()) return setError("Informe o nome do contato.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Informe um e-mail válido.");
    if (!stageId) return setError("Selecione uma etapa.");
    if (value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0))
      return setError("Informe um valor válido.");
    if (activeDeal) return setError("Este lead já existe nesta esteira.");
    mutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Criar lead"
      description="Identifique o contato e configure a negociação."
      wide
    >
      <form
        className="max-h-[72vh] space-y-5 overflow-y-auto pr-1"
        onSubmit={submit}
        data-testid="create-lead-form"
      >
        <section className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">CONTATO</h3>
          <div className="space-y-1">
            <Label htmlFor="manual-lead-phone">Telefone *</Label>
            <Input
              id="manual-lead-phone"
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => {
                const normalized = normalizePhoneForLookup(phone);
                if (normalized) setPhone(formatPhoneForDisplay(normalized));
              }}
              placeholder="+55 (__) _____-____"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="manual-lead-name">Nome *</Label>
              <Input
                id="manual-lead-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={Boolean(lookup.data?.contact)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-lead-email">E-mail</Label>
              <Input
                id="manual-lead-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={Boolean(lookup.data?.contact)}
              />
            </div>
          </div>
          <div aria-live="polite" className="text-sm">
            {lookup.isFetching ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Verificando contato…
              </span>
            ) : activeDeal ? (
              <div
                role="status"
                className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950"
              >
                <p className="font-semibold">Este lead já existe nesta esteira</p>
                <p>
                  {lookup.data?.contact?.name} · {formatLeadCode(activeDeal.leadSequence)}
                </p>
                <p>
                  {activeDeal.stage?.name} · {activeDeal.owner?.name ?? "Sem responsável"}
                </p>
                <Button type="button" size="sm" className="mt-2" onClick={openExisting}>
                  Verificar lead
                </Button>
              </div>
            ) : lookup.data?.contact ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
                <p className="font-semibold">Contato encontrado</p>
                <p>
                  {lookup.data.contact.name} · {formatPhoneForDisplay(lookup.data.phone)}
                </p>
                {lookup.data.contact.deals[0] ? (
                  <p className="text-xs">
                    Negociação anterior: {formatLeadCode(lookup.data.contact.deals[0].leadSequence)}{" "}
                    · {lookup.data.contact.deals[0].stage?.name}
                  </p>
                ) : null}
              </div>
            ) : debouncedPhone && lookup.isSuccess ? (
              <p className="text-muted-foreground">
                Nenhum contato encontrado. Um novo contato será criado.
              </p>
            ) : null}
          </div>
        </section>
        <section className="space-y-3 border-t pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground">NEGOCIAÇÃO</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="manual-lead-stage">Etapa</Label>
              <Select
                id="manual-lead-stage"
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
              >
                {orderedStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-lead-owner">Responsável</Label>
              <Select
                id="manual-lead-owner"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                {users.data?.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="manual-lead-value">Valor estimado</Label>
              <Input
                id="manual-lead-value"
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="R$ —"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="manual-lead-source">Origem informada</Label>
              <Select
                id="manual-lead-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Não informada</option>
                {SOURCES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </div>
          </div>
        </section>
        <section className="space-y-2 border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            aria-expanded={noteOpen}
            onClick={() => setNoteOpen(!noteOpen)}
          >
            {noteOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{" "}
            Adicionar anotação
          </Button>
          {noteOpen ? (
            <Textarea
              aria-label="Anotação inicial"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={5000}
            />
          ) : null}
          <Button
            type="button"
            variant="ghost"
            aria-expanded={taskOpen}
            onClick={() => setTaskOpen(!taskOpen)}
          >
            {taskOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}{" "}
            Adicionar tarefa
          </Button>
          {taskOpen ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                aria-label="Título da tarefa"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Ex.: Retornar contato"
              />
              <Input
                aria-label="Prazo da tarefa"
                type="datetime-local"
                value={taskDueAt}
                onChange={(e) => setTaskDueAt(e.target.value)}
              />
            </div>
          ) : null}
        </section>
        {lookup.data?.possibleEmailContact ? (
          <p role="status" className="text-sm text-amber-700">
            Existe um possível contato com este e-mail. Confirme o telefone antes de continuar.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending || Boolean(activeDeal)}>
            {mutation.isPending ? "Criando…" : "Criar lead"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
