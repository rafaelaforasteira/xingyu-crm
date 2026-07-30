"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { pipelinesApi, settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Pipeline, PipelineInput } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const pipelineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(120, "O nome deve ter no máximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(500, "A descrição deve ter no máximo 500 caracteres."),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Selecione uma cor válida."),
  icon: z.string().max(50),
  defaultTeamId: z.string(),
  defaultOwnerId: z.string(),
  favorite: z.boolean(),
});

type PipelineFormValues = z.infer<typeof pipelineSchema>;

const EMPTY_VALUES: PipelineFormValues = {
  name: "",
  description: "",
  color: "#7c3aed",
  icon: "Kanban",
  defaultTeamId: "",
  defaultOwnerId: "",
  favorite: false,
};

export function PipelineFormDialog({
  open,
  onOpenChange,
  pipeline,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline?: Pipeline | null;
  onSaved?: (pipeline: Pipeline, mode: "create" | "edit") => void;
}) {
  const queryClient = useQueryClient();
  const mode = pipeline ? "edit" : "create";
  const form = useForm<PipelineFormValues>({
    resolver: zodResolver(pipelineSchema),
    defaultValues: EMPTY_VALUES,
  });

  const settings = useQuery({
    queryKey: [...queryKeys.settings, "pipeline-form"],
    queryFn: async () => {
      const [teams, users] = await Promise.all([
        settingsApi.teams(),
        settingsApi.users(),
      ]);
      return { teams, users };
    },
    enabled: open,
    retry: false,
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset(
      pipeline
        ? {
            name: pipeline.name,
            description: pipeline.description ?? "",
            color: pipeline.color ?? "#7c3aed",
            icon: pipeline.icon ?? "Kanban",
            defaultTeamId: pipeline.defaultTeamId ?? "",
            defaultOwnerId: pipeline.defaultOwnerId ?? "",
            favorite: pipeline.favorite ?? false,
          }
        : EMPTY_VALUES,
    );
  }, [form, open, pipeline]);

  const mutation = useMutation({
    mutationFn: (values: PipelineFormValues) => {
      const input: PipelineInput = {
        name: values.name.trim(),
        description: values.description.trim(),
        color: values.color,
        icon: values.icon,
        defaultTeamId: values.defaultTeamId || null,
        defaultOwnerId: values.defaultOwnerId || null,
        favorite: values.favorite,
      };
      return pipeline
        ? pipelinesApi.update(pipeline.id, input)
        : pipelinesApi.create(input);
    },
    onSuccess: (savedPipeline) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
      queryClient.setQueryData(
        queryKeys.pipelines.detail(savedPipeline.id),
        savedPipeline,
      );
      toast.success(pipeline ? "Pipeline atualizado" : "Pipeline criado");
      onOpenChange(false);
      onSaved?.(savedPipeline, mode);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={pipeline ? "Editar pipeline" : "Criar pipeline"}
      description="Defina a identidade e os responsáveis padrão deste funil."
      wide
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="space-y-1">
          <Label htmlFor="pipeline-name">Nome</Label>
          <Input
            id="pipeline-name"
            autoFocus
            placeholder="Ex.: Vendas consultivas"
            {...form.register("name")}
          />
          {form.formState.errors.name ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="pipeline-description">Descrição</Label>
          <Textarea
            id="pipeline-description"
            rows={3}
            placeholder="Explique quando este pipeline deve ser usado."
            {...form.register("description")}
          />
          {form.formState.errors.description ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.description.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pipeline-color">Cor</Label>
            <div className="flex items-center gap-2">
              <Input
                id="pipeline-color"
                type="color"
                className="w-14 cursor-pointer px-1"
                {...form.register("color")}
              />
              <Input
                aria-label="Código da cor"
                value={form.watch("color")}
                onChange={(event) =>
                  form.setValue("color", event.target.value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </div>
            {form.formState.errors.color ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.color.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pipeline-icon">Ícone</Label>
            <Select id="pipeline-icon" {...form.register("icon")}>
              <option value="Kanban">Kanban</option>
              <option value="ShoppingBag">Compras</option>
              <option value="Handshake">Relacionamento</option>
              <option value="Rocket">Lançamento</option>
              <option value="Headphones">Atendimento</option>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pipeline-team">Equipe padrão</Label>
            <Select id="pipeline-team" {...form.register("defaultTeamId")}>
              <option value="">Sem equipe padrão</option>
              {settings.data?.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="pipeline-owner">Responsável padrão</Label>
            <Select id="pipeline-owner" {...form.register("defaultOwnerId")}>
              <option value="">Sem responsável padrão</option>
              {settings.data?.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            {...form.register("favorite")}
          />
          Adicionar aos favoritos
        </label>

        {settings.error ? (
          <p className="text-xs text-muted-foreground">
            Equipes e responsáveis não puderam ser carregados. Você ainda pode
            salvar o pipeline sem esses vínculos.
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando…" : pipeline ? "Salvar" : "Criar pipeline"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
