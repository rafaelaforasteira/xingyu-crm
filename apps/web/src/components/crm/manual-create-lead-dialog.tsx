"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CountryCode } from "libphonenumber-js";
import { CalendarClock, ChevronDown, Handshake, Loader2, NotebookPen, UserRound } from "lucide-react";
import { toast } from "sonner";
import { dealsApi, pipelinesApi } from "@/lib/api";
import { formatPhoneForDisplay } from "@/lib/format-phone-display";
import { formatLeadCode } from "@/components/crm/conversation/conversation-list-utils";
import { queryKeys } from "@/lib/query-keys";
import type { Pipeline } from "@/lib/types";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PopoverSelect } from "@/components/ui/popover-select";
import { Textarea } from "@/components/ui/textarea";
import { useUiStore } from "@/stores/ui";
import { DEFAULT_PHONE_COUNTRY, checkPhone } from "@/lib/phone-input";
import { centsToReais } from "@/lib/currency-input";
import { stageKind } from "@/lib/closing-stages";
import { cn } from "@/lib/utils";
import { CurrencyField, FIELD_CLASS, FieldError, PhoneField, SourceField } from "@/components/crm/lead/lead-fields";

const NOTE_MAX = 5000;

function SectionTitle({ icon: Icon, children }: { icon: typeof UserRound; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      {children}
    </h3>
  );
}

function FieldLabel({ htmlFor, children, required }: { htmlFor?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground">
      {children}
      {required ? <span className="text-primary"> *</span> : null}
    </label>
  );
}

/** Abre/fecha uma parte opcional (anotação, tarefa) no mesmo estilo. */
function OptionalBlock({
  icon: Icon,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border transition-colors", open ? "border-primary/25 bg-primary/[0.02]" : "border-border")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] text-primary">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-muted-foreground">{hint}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? <div className="space-y-3 px-3 pb-3">{children}</div> : null}
    </div>
  );
}

function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function quickDue(kind: "today" | "tomorrow" | "in3"): string {
  const date = new Date();
  if (kind === "today") date.setHours(Math.max(date.getHours() + 1, 18), 0, 0, 0);
  if (kind === "tomorrow") {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  }
  if (kind === "in3") {
    date.setDate(date.getDate() + 3);
    date.setHours(9, 0, 0, 0);
  }
  return toLocalInput(date);
}

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
  const [country, setCountry] = React.useState<CountryCode>(DEFAULT_PHONE_COUNTRY);
  const [phone, setPhone] = React.useState("");
  const [phoneTouched, setPhoneTouched] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [stageId, setStageId] = React.useState("");
  const [ownerId, setOwnerId] = React.useState("");
  const [valueCents, setValueCents] = React.useState<number | null>(null);
  const [source, setSource] = React.useState("");
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDueAt, setTaskDueAt] = React.useState("");
  const [debouncedPhone, setDebouncedPhone] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setCountry(DEFAULT_PHONE_COUNTRY);
    setPhone("");
    setPhoneTouched(false);
    setName("");
    setEmail("");
    setValueCents(null);
    setSource("");
    setNote("");
    setTaskTitle("");
    setTaskDueAt("");
    setNoteOpen(false);
    setTaskOpen(false);
    setErrors({});
    setFormError("");
    setStageId(defaultStage?.id ?? "");
    setOwnerId(pipeline.defaultOwnerId ?? user?.id ?? "");
  }, [defaultStage?.id, open, pipeline.defaultOwnerId, user?.id]);

  const phoneCheck = checkPhone(phone, country);
  const e164Digits = phoneCheck.valid ? phoneCheck.e164.replace(/^\+/, "") : "";
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedPhone(e164Digits), 350);
    return () => window.clearTimeout(timer);
  }, [e164Digits]);

  const lookup = useQuery({
    queryKey: [...queryKeys.contacts.all, "manual-lead-lookup", pipeline.id, debouncedPhone, email.trim().toLowerCase()],
    queryFn: () =>
      dealsApi.lookupManualLead({ pipelineId: pipeline.id, phone: debouncedPhone, email: email.trim() || undefined }),
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
    queryKey: queryKeys.pipelines.eligibleUsers(pipeline.id),
    queryFn: () => pipelinesApi.eligibleUsers(pipeline.id),
    enabled: open,
    retry: false,
  });
  const activeDeal = lookup.data?.activeDeal;
  const contactLocked = Boolean(lookup.data?.contact);

  const goToDeal = (dealId: string) => {
    onOpenChange(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "kanban");
    params.set("deal", dealId);
    params.delete("conversation");
    params.delete("pipeline");
    router.replace(`/operacao?${params.toString()}`, { scroll: false });
    openDealDrawer(dealId);
  };

  const mutation = useMutation({
    mutationFn: () =>
      dealsApi.createManualLead({
        phone: phoneCheck.valid ? phoneCheck.e164 : phone,
        contactName: name.trim(),
        email: email.trim() || undefined,
        pipelineId: pipeline.id,
        stageId,
        ownerId: ownerId || undefined,
        value: centsToReais(valueCents),
        informedSource: source || undefined,
        note: note.trim() || undefined,
        taskTitle: taskTitle.trim() || undefined,
        taskDueAt: taskDueAt ? new Date(taskDueAt).toISOString() : undefined,
      }),
    onSuccess: async (deal) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.board(pipeline.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all }),
      ]);
      toast.success(`${formatLeadCode(deal.leadSequence) ?? "Lead"} criado com sucesso.`);
      goToDeal(deal.id);
    },
    onError: (reason: Error) => {
      setFormError(reason.message);
      toast.error(reason.message);
      void lookup.refetch();
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setPhoneTouched(true);
    setFormError("");
    const next: Record<string, string> = {};
    if (!phoneCheck.valid) next.phone = "phone";
    if (!name.trim()) next.name = "Informe o nome do contato.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Informe um e-mail válido.";
    if (!stageId) next.stage = "Selecione uma etapa.";
    if (taskOpen && taskDueAt && !taskTitle.trim()) next.task = "Dê um título para a tarefa.";
    if (taskOpen && taskTitle.trim() && taskDueAt && new Date(taskDueAt).getTime() < Date.now() - 60_000)
      next.task = "O prazo da tarefa já passou.";
    setErrors(next);
    if (Object.keys(next).length) return;
    if (activeDeal) return setFormError("Este lead já existe nesta esteira.");
    mutation.mutate();
  };

  const stageOptions = orderedStages.map((stage) => {
    const kind = stageKind(stage);
    return {
      value: stage.id,
      label: kind === "OPEN" ? stage.name : `${stage.name} · ${kind === "WON" ? "ganho" : "perdido"}`,
      leading: <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color ?? "#A78BFA" }} />,
    };
  });
  const ownerOptions = (users.data ?? []).map((entry) => ({
    value: entry.id,
    label: entry.name,
    leading: <Avatar name={entry.name} src={entry.avatarUrl} className="h-6 w-6 text-[9px]" />,
  }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Criar lead"
      description="Identifique o contato e configure a negociação."
      className="max-w-[600px] overflow-hidden rounded-2xl"
    >
      <form
        className="-mx-5 -my-4 flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col"
        onSubmit={submit}
        data-testid="create-lead-form"
        noValidate
      >
        <div className="min-w-0 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-4">
            <SectionTitle icon={UserRound}>Contato</SectionTitle>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="manual-lead-phone" required>Telefone</FieldLabel>
              <PhoneField
                id="manual-lead-phone"
                country={country}
                national={phone}
                showError={phoneTouched || Boolean(errors.phone)}
                onBlur={() => setPhoneTouched(true)}
                onChange={(next) => {
                  setCountry(next.country);
                  setPhone(next.national);
                  setErrors((current) => ({ ...current, phone: "" }));
                }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="manual-lead-name" required>Nome</FieldLabel>
                <Input
                  id="manual-lead-name"
                  className={FIELD_CLASS}
                  value={name}
                  maxLength={200}
                  placeholder="Nome do contato"
                  aria-invalid={Boolean(errors.name) || undefined}
                  onChange={(event) => setName(event.target.value)}
                  disabled={contactLocked}
                />
                {errors.name ? <FieldError>{errors.name}</FieldError> : null}
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="manual-lead-email">E-mail</FieldLabel>
                <Input
                  id="manual-lead-email"
                  type="email"
                  className={FIELD_CLASS}
                  value={email}
                  placeholder="nome@empresa.com"
                  aria-invalid={Boolean(errors.email) || undefined}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={contactLocked}
                />
                {errors.email ? <FieldError>{errors.email}</FieldError> : null}
              </div>
            </div>
            <div aria-live="polite" className="text-sm empty:hidden">
              {lookup.isFetching ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Verificando contato…
                </span>
              ) : activeDeal ? (
                <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
                  <p className="font-semibold">Este lead já existe nesta esteira</p>
                  <p>{lookup.data?.contact?.name} · {formatLeadCode(activeDeal.leadSequence)}</p>
                  <p>{activeDeal.stage?.name} · {activeDeal.owner?.name ?? "Sem responsável"}</p>
                  <Button type="button" size="sm" className="mt-2" onClick={() => goToDeal(activeDeal.id)}>
                    Verificar lead
                  </Button>
                </div>
              ) : lookup.data?.contact ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
                  <p className="font-semibold">Contato encontrado</p>
                  <p>{lookup.data.contact.name} · {formatPhoneForDisplay(lookup.data.phone)}</p>
                  {lookup.data.contact.deals[0] ? (
                    <p className="text-xs">
                      Negociação anterior: {formatLeadCode(lookup.data.contact.deals[0].leadSequence)} ·{" "}
                      {lookup.data.contact.deals[0].stage?.name}
                    </p>
                  ) : null}
                </div>
              ) : debouncedPhone && lookup.isSuccess ? (
                <p className="text-xs text-muted-foreground">Nenhum contato com esse número. Um novo contato será criado.</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-4 border-t border-border/70 pt-5">
            <SectionTitle icon={Handshake}>Negociação</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="manual-lead-stage">Etapa</FieldLabel>
                <PopoverSelect
                  id="manual-lead-stage"
                  aria-label="Etapa"
                  value={stageId}
                  options={stageOptions}
                  onChange={setStageId}
                  invalid={Boolean(errors.stage)}
                />
                {errors.stage ? <FieldError>{errors.stage}</FieldError> : null}
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="manual-lead-owner">Responsável</FieldLabel>
                <PopoverSelect
                  id="manual-lead-owner"
                  aria-label="Responsável"
                  value={ownerId}
                  options={ownerOptions}
                  onChange={setOwnerId}
                  placeholder={users.isLoading ? "Carregando…" : "Sem responsável"}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="manual-lead-value">Valor estimado</FieldLabel>
                <CurrencyField id="manual-lead-value" cents={valueCents} onChange={setValueCents} />
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="manual-lead-source">Origem informada</FieldLabel>
                <SourceField id="manual-lead-source" value={source} onChange={setSource} />
              </div>
            </div>
          </section>

          <section className="space-y-2.5 border-t border-border/70 pt-5">
            <OptionalBlock
              icon={NotebookPen}
              title="Anotação"
              hint="Contexto do primeiro contato, para quem for atender."
              open={noteOpen}
              onToggle={() => setNoteOpen((value) => !value)}
            >
              <div className="relative">
                <Textarea
                  aria-label="Anotação inicial"
                  value={note}
                  maxLength={NOTE_MAX}
                  rows={3}
                  placeholder="Ex.: Pediu catálogo de atacado e prazo de entrega para Curitiba."
                  className="resize-none rounded-xl bg-card pb-6 focus-visible:ring-primary/20"
                  onChange={(event) => setNote(event.target.value)}
                />
                <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] tabular-nums text-muted-foreground">
                  {note.length}/{NOTE_MAX}
                </span>
              </div>
            </OptionalBlock>
            <OptionalBlock
              icon={CalendarClock}
              title="Tarefa"
              hint="Agende o próximo passo com prazo."
              open={taskOpen}
              onToggle={() => setTaskOpen((value) => !value)}
            >
              <Input
                aria-label="Título da tarefa"
                className={FIELD_CLASS}
                value={taskTitle}
                maxLength={200}
                placeholder="Ex.: Retornar contato com proposta"
                onChange={(event) => setTaskTitle(event.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  aria-label="Prazo da tarefa"
                  type="datetime-local"
                  className={cn(FIELD_CLASS, "w-auto min-w-[210px] flex-1")}
                  value={taskDueAt}
                  min={toLocalInput(new Date())}
                  onChange={(event) => setTaskDueAt(event.target.value)}
                />
                {([
                  ["today", "Hoje"],
                  ["tomorrow", "Amanhã 9h"],
                  ["in3", "Em 3 dias"],
                ] as const).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setTaskDueAt(quickDue(kind))}
                    className="h-8 rounded-full border border-border px-3 text-xs font-medium text-muted-foreground transition hover:border-primary/35 hover:bg-primary/[0.06] hover:text-primary"
                  >
                    {label}
                  </button>
                ))}
              </div>
              {errors.task ? <FieldError>{errors.task}</FieldError> : null}
            </OptionalBlock>
          </section>

          {lookup.data?.possibleEmailContact ? (
            <p role="status" className="text-sm text-amber-700">
              Existe um possível contato com este e-mail. Confirme o telefone antes de continuar.
            </p>
          ) : null}
          {formError ? <FieldError>{formError}</FieldError> : null}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-6 py-4">
          <Button type="button" variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" className="rounded-xl px-5" disabled={mutation.isPending || Boolean(activeDeal)}>
            {mutation.isPending ? "Criando…" : "Criar lead"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
