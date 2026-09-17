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
import { PipelineIdentityFields, PIPELINE_DESCRIPTION_MAX_LENGTH } from "./pipeline-identity-fields";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/filter-select";
import { Settings2, UserRound, UsersRound } from "lucide-react";

const pipelineSchema = z.object({
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(120),
  description: z.string().trim().max(PIPELINE_DESCRIPTION_MAX_LENGTH, "A descrição deve ter no máximo 140 caracteres."),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Selecione uma cor válida."),
  icon: z.string().refine((value) => PIPELINE_ICON_KEYS.includes(value), "Selecione um ícone válido."),
  defaultTeamId: z.string(),
  defaultOwnerId: z.string(),
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
    description="Configure as informações principais deste funil."
    className="max-w-xl overflow-hidden"
  >
    <form className="-mx-5 -my-4 flex max-h-[calc(100dvh-8rem)] min-w-0 flex-col" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <div className="min-w-0 space-y-5 overflow-y-auto px-5 py-5 scrollbar-thin">
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="pipeline-name">Nome</Label>
        <Input id="pipeline-name" className="h-10 min-w-0" autoFocus placeholder="Ex.: Vendas consultivas" {...form.register("name")} />
        {form.formState.errors.name ? <p className="text-xs text-destructive">{form.formState.errors.name.message}</p> : null}
      </div>

      <PipelineIdentityFields
        description={form.watch("description")}
        color={form.watch("color")}
        icon={form.watch("icon")}
        favorite={form.watch("favorite")}
        errors={{ description: form.formState.errors.description?.message, color: form.formState.errors.color?.message, icon: form.formState.errors.icon?.message }}
        onChange={setIdentityValue}
      />

      <fieldset className="min-w-0 rounded-xl border border-border bg-muted/20 p-4">
        <legend className="sr-only">Padrões operacionais</legend>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Settings2 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Padrões operacionais</p>
            <p className="text-xs text-muted-foreground">Defina vínculos automáticos para novos negócios.</p>
          </div>
        </div>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <FilterSelect
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
          <FilterSelect
            label="Responsável padrão"
            icon={UserRound}
            value={form.watch("defaultOwnerId")}
            options={[
              { value: "", label: "Sem responsável padrão" },
              ...(pipeline?.defaultOwnerId && !settings.data?.users.some((user) => user.id === pipeline.defaultOwnerId)
                ? [{ value: pipeline.defaultOwnerId, label: pipeline.defaultOwner?.name ?? "Responsável atual (sem acesso)" }]
                : []),
              ...(settings.data?.users.map((user) => ({ value: user.id, label: user.name })) ?? []),
            ]}
            onChange={(value) => form.setValue("defaultOwnerId", value, { shouldDirty: true, shouldValidate: true })}
          />
        </div>
      </fieldset>

      {settings.error ? <p className="text-xs text-muted-foreground">Equipes e responsáveis não puderam ser carregados. Você ainda pode salvar sem alterar esses vínculos.</p> : null}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-5 py-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Salvando…" : pipeline ? "Salvar alterações" : "Criar pipeline"}</Button>
      </div>
    </form>
  </Dialog>;
}
