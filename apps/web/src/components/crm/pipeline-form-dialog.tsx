"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { pipelinesApi, settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { PIPELINE_ICON_KEYS } from "@/lib/pipeline-icons";
import type { Pipeline, PipelineInput } from "@/lib/types";
import { PipelineIconPicker, PipelineIdentityFields, PIPELINE_DESCRIPTION_MAX_LENGTH } from "./pipeline-identity-fields";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover } from "@/components/ui/popover";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, UserRound, UsersRound, type LucideIcon } from "lucide-react";

/**
 * Seletor de equipe/responsável. Abre a lista em um popover sobre a página
 * (portal), então o formulário não cresce nem ganha rolagem extra ao abrir.
 */
type DefaultOption = { value: string; label: string; avatarUrl?: string | null };

function OptionBubble({ option, icon: Icon, size = "md" }: { option?: DefaultOption; icon: LucideIcon; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-6 w-6 text-[9px]" : "h-7 w-7 text-[10px]";
  if (!option?.value) {
    return (
      <span className={cn("flex shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground", box)}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
    );
  }
  return <Avatar name={option.label} src={option.avatarUrl} className={cn("shrink-0", box)} />;
}

function PipelineDefaultSelect({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  required = false,
  error,
}: {
  label: string;
  icon: LucideIcon;
  value: string;
  options: DefaultOption[];
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value) ?? (required ? undefined : options[0]);
  const isEmpty = !selected?.value;

  return (
    <div className="min-w-0">
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="start"
        contentWidth={232}
        className="grid w-full"
        aria-label={label}
        trigger={
          <button
            type="button"
            aria-label={label}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            aria-required={required || undefined}
            onClick={() => setOpen((current) => !current)}
            className={cn(
              "flex h-12 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 text-left transition hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
              open && "border-primary/45 ring-2 ring-primary/15",
              error && !open && "border-destructive/60 ring-2 ring-destructive/10",
            )}
          >
            {isEmpty ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/[0.08] text-primary">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
            ) : (
              <OptionBubble option={selected} icon={Icon} />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] leading-tight text-muted-foreground">
                {label}
                {required ? <span className="text-primary"> *</span> : null}
              </span>
              <span className={cn("block truncate text-sm leading-tight", isEmpty ? "text-muted-foreground" : "font-medium text-foreground")}>
                {isEmpty ? (required ? "Escolher…" : "Nenhum") : selected?.label}
              </span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        }
      >
        <div role="listbox" aria-label={label} className="max-h-60 overflow-y-auto p-1.5">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value || "none"}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition",
                  active ? "bg-primary/[0.08] font-medium text-primary" : "text-foreground hover:bg-accent",
                  !option.value && !active && "text-muted-foreground",
                )}
              >
                <OptionBubble option={option} icon={Icon} size="sm" />
                <span className="min-w-0 flex-1 truncate">{option.value ? option.label : "Nenhum"}</span>
                {active ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </Popover>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

const pipelineSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(120),
  description: z.string().trim().max(PIPELINE_DESCRIPTION_MAX_LENGTH, `A descrição deve ter no máximo ${PIPELINE_DESCRIPTION_MAX_LENGTH} caracteres.`),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Selecione uma cor válida."),
  icon: z.string().refine((value) => PIPELINE_ICON_KEYS.includes(value), "Selecione um ícone válido."),
  defaultTeamId: z.string(),
  defaultOwnerId: z.string().min(1, "Escolha o responsável padrão do pipeline."),
  favorite: z.boolean(),
});

type PipelineFormValues = z.infer<typeof pipelineSchema>;
const EMPTY_VALUES: PipelineFormValues = { name: "", description: "", color: "#7C3AED", icon: "kanban", defaultTeamId: "", defaultOwnerId: "", favorite: false };

export function PipelineFormDialog({ open, onOpenChange, pipeline, onSaved, initialSpace = "COMMERCIAL" }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline?: Pipeline | null;
  onSaved?: (pipeline: Pipeline, mode: "create" | "edit") => void;
  initialSpace?: "COMMERCIAL" | "ATTENDANCE";
}) {
  const queryClient = useQueryClient();
  const mode = pipeline ? "edit" : "create";
  const form = useForm<PipelineFormValues>({ resolver: zodResolver(pipelineSchema), defaultValues: EMPTY_VALUES });

  const settings = useQuery({
    queryKey: [...queryKeys.settings, "pipeline-form", pipeline?.id],
    queryFn: async () => {
      const [teams, users, access, eligibleUsers] = await Promise.all([
        settingsApi.teams(), settingsApi.users(), pipelinesApi.accessOverview(),
        pipeline ? pipelinesApi.eligibleUsers(pipeline.id) : Promise.resolve(null),
      ]);
      const currentAccess = access.pipelines.find((item) => item.id === pipeline?.id);
      const teamIds = currentAccess?.accessMode === "RESTRICTED" ? new Set(currentAccess.teamIds) : null;
      return { teams: teamIds ? teams.filter((team) => teamIds.has(team.id)) : teams, users: eligibleUsers ?? users };
    },
    enabled: open,
    retry: false,
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(pipeline ? {
      name: pipeline.name,
      description: pipeline.description ?? "",
      color: pipeline.color ?? "#7C3AED",
      icon: PIPELINE_ICON_KEYS.includes(pipeline.icon ?? "") ? pipeline.icon! : "kanban",
      defaultTeamId: pipeline.defaultTeamId ?? "",
      defaultOwnerId: pipeline.defaultOwnerId ?? "",
      favorite: pipeline.favorite ?? false,
    } : EMPTY_VALUES);
  }, [form, open, pipeline]);

  const mutation = useMutation({
    mutationFn: (values: PipelineFormValues) => {
      const input: PipelineInput = { ...values, name: values.name.trim(), description: values.description.trim(), defaultTeamId: values.defaultTeamId || null, defaultOwnerId: values.defaultOwnerId || null, space: pipeline?.space ?? initialSpace };
      return pipeline ? pipelinesApi.update(pipeline.id, input) : pipelinesApi.create(input);
    },
    onSuccess: (savedPipeline) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
      queryClient.setQueryData(queryKeys.pipelines.detail(savedPipeline.id), savedPipeline);
      toast.success(pipeline ? "Pipeline atualizado" : "Pipeline criado");
      onOpenChange(false);
      onSaved?.(savedPipeline, mode);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setIdentityValue = (field: "description" | "color" | "icon" | "favorite", value: string | boolean) => {
    if (field === "favorite") form.setValue(field, Boolean(value), { shouldDirty: true, shouldValidate: true });
    else form.setValue(field, String(value), { shouldDirty: true, shouldValidate: true });
  };

  return <Dialog
    open={open}
    onOpenChange={onOpenChange}
    title={pipeline ? "Editar pipeline" : "Criar pipeline"}
    description={pipeline ? "Ajuste a identidade e os padrões deste funil." : "Dê um nome, uma cara e um dono para o novo funil."}
    className="max-w-[520px] overflow-hidden rounded-2xl"
  >
    <form className="-mx-5 -my-4 flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="min-w-0 space-y-6 overflow-y-auto px-6 py-6 scrollbar-thin">
      <div className="flex min-w-0 items-center gap-4">
        <PipelineIconPicker
          color={form.watch("color")}
          icon={form.watch("icon")}
          error={form.formState.errors.icon?.message}
          onChange={(value) => setIdentityValue("icon", value)}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <label htmlFor="pipeline-name" className="text-[13px] font-medium text-foreground">Nome do pipeline</label>
          <Input id="pipeline-name" className="h-11 min-w-0 rounded-xl text-[15px]" autoFocus placeholder="Ex.: Vendas consultivas" {...form.register("name")} />
          {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
        </div>
      </div>

      <PipelineIdentityFields
        description={form.watch("description")}
        color={form.watch("color")}
        favorite={form.watch("favorite")}
        errors={{ description: form.formState.errors.description?.message, color: form.formState.errors.color?.message }}
        onChange={setIdentityValue}
      />

      <fieldset className="min-w-0 space-y-3 border-t border-border/70 pt-5">
        <div>
          <legend className="text-[13px] font-medium text-foreground">Padrões para novos negócios</legend>
          <p className="mt-0.5 text-xs text-muted-foreground">Quem recebe automaticamente os negócios que entrarem neste pipeline.</p>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <PipelineDefaultSelect
            label="Equipe padrão"
            icon={UsersRound}
            value={form.watch("defaultTeamId")}
            options={[
              { value: "", label: "Sem equipe padrão" },
              ...(pipeline?.defaultTeamId && !settings.data?.teams.some((team) => team.id === pipeline.defaultTeamId)
                ? [{ value: pipeline.defaultTeamId, label: pipeline.defaultTeam?.name ?? "Equipe atual (sem acesso)" }]
                : []),
              ...(settings.data?.teams.map((team) => ({ value: team.id, label: team.name })) ?? []),
            ]}
            onChange={(value) => form.setValue("defaultTeamId", value, { shouldDirty: true, shouldValidate: true })}
          />
          <PipelineDefaultSelect
            label="Responsável padrão"
            icon={UserRound}
            value={form.watch("defaultOwnerId")}
            required
            error={form.formState.errors.defaultOwnerId?.message}
            options={[
              ...(pipeline?.defaultOwnerId && !settings.data?.users.some((user) => user.id === pipeline.defaultOwnerId)
                ? [{ value: pipeline.defaultOwnerId, label: pipeline.defaultOwner?.name ?? "Responsável atual (sem acesso)", avatarUrl: pipeline.defaultOwner?.avatarUrl }]
                : []),
              ...(settings.data?.users.map((user) => ({ value: user.id, label: user.name, avatarUrl: user.avatarUrl })) ?? []),
            ]}
            onChange={(value) => form.setValue("defaultOwnerId", value, { shouldDirty: true, shouldValidate: true })}
          />
        </div>
      </fieldset>

      {settings.error ? <p className="text-xs text-muted-foreground">Equipes e responsáveis não puderam ser carregados. Você ainda pode salvar sem alterar esses vínculos.</p> : null}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-6 py-4">
        <Button type="button" variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="submit" className="rounded-xl px-5" disabled={mutation.isPending}>{mutation.isPending ? "Salvando…" : pipeline ? "Salvar alterações" : "Criar pipeline"}</Button>
      </div>
    </form>
  </Dialog>;
}
