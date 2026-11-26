"use client";

import * as React from "react";
import { Check, Pencil, Pipette, Star } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { PIPELINE_ICON_OPTIONS, resolvePipelineIcon } from "@/lib/pipeline-icons";
import { cn } from "@/lib/utils";

export const PIPELINE_DESCRIPTION_MAX_LENGTH = 80;

/** Paleta curta para escolher a cor em um clique; o seletor livre continua disponível. */
export const PIPELINE_COLOR_PRESETS = [
  "#7C3AED",
  "#2563EB",
  "#0EA5E9",
  "#10B981",
  "#F59E0B",
  "#F43F5E",
  "#EC4899",
  "#64748B",
] as const;

const HEX = /^#[0-9a-f]{6}$/i;
const safeColor = (value: string) => (HEX.test(value) ? value : "#7C3AED");

/** Bloco do ícone: mostra a identidade atual e abre a grade de ícones. */
export function PipelineIconPicker({
  color,
  icon,
  error,
  onChange,
}: {
  color: string;
  icon: string;
  error?: string;
  onChange: (icon: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const SelectedIcon = resolvePipelineIcon(icon);
  const tint = safeColor(color);

  return (
    <div className="shrink-0">
      <Popover
        open={open}
        onOpenChange={setOpen}
        align="start"
        contentWidth={288}
        aria-label="Escolher ícone do pipeline"
        trigger={
          <button
            type="button"
            aria-label="Escolher ícone do pipeline"
            aria-expanded={open}
            title="Trocar ícone"
            onClick={() => setOpen((current) => !current)}
            className="group relative flex h-14 w-14 items-center justify-center rounded-2xl transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            style={{ backgroundColor: `${tint}1f`, color: tint }}
          >
            <SelectedIcon className="h-6 w-6" />
            <span
              aria-hidden
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card text-white shadow-sm transition-transform group-hover:scale-110"
              style={{ backgroundColor: tint }}
            >
              <Pencil className="h-2.5 w-2.5" strokeWidth={2.5} />
            </span>
          </button>
        }
      >
        <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto p-2">
          {PIPELINE_ICON_OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = option.key === icon;
            return (
              <button
                key={option.key}
                type="button"
                title={option.label}
                aria-label={option.label}
                aria-pressed={selected}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition",
                  selected ? "text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                style={selected ? { backgroundColor: tint } : undefined}
                onClick={() => {
                  onChange(option.key);
                  setOpen(false);
                }}
              >
                <Icon className="h-[18px] w-[18px]" />
              </button>
            );
          })}
        </div>
      </Popover>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function PipelineIdentityFields({
  description,
  color,
  favorite,
  errors,
  onChange,
}: {
  description: string;
  color: string;
  icon?: string;
  favorite: boolean;
  errors?: { description?: string; color?: string; icon?: string };
  onChange: (field: "description" | "color" | "icon" | "favorite", value: string | boolean) => void;
}) {
  const descriptionCounterId = React.useId();
  const current = safeColor(color).toUpperCase();
  const isCustom = !PIPELINE_COLOR_PRESETS.includes(current as (typeof PIPELINE_COLOR_PRESETS)[number]);

  return (
    <>
      <div className="space-y-2">
        <label htmlFor="pipeline-description" className="text-[13px] font-medium text-foreground">
          Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <div className="relative">
          <Textarea
            id="pipeline-description"
            rows={2}
            maxLength={description.length <= PIPELINE_DESCRIPTION_MAX_LENGTH ? PIPELINE_DESCRIPTION_MAX_LENGTH : undefined}
            aria-describedby={descriptionCounterId}
            aria-invalid={Boolean(errors?.description)}
            placeholder="Quando este pipeline deve ser usado?"
            className="min-h-[72px] resize-none rounded-xl pb-6"
            value={description}
            onChange={(event) => onChange("description", event.target.value)}
          />
          <p
            id={descriptionCounterId}
            className={cn(
              "pointer-events-none absolute bottom-2 right-3 text-[11px] tabular-nums text-muted-foreground/80",
              description.length >= PIPELINE_DESCRIPTION_MAX_LENGTH - 15 && "text-foreground",
              description.length > PIPELINE_DESCRIPTION_MAX_LENGTH && "text-destructive",
            )}
          >
            {description.length}/{PIPELINE_DESCRIPTION_MAX_LENGTH}
          </p>
        </div>
        {errors?.description ? <p className="text-xs text-destructive">{errors.description}</p> : null}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-[13px] font-medium text-foreground">Identidade visual</legend>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Cor do pipeline">
            {PIPELINE_COLOR_PRESETS.map((preset) => {
              const selected = current === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`Cor ${preset}`}
                  onClick={() => onChange("color", preset)}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    selected && "ring-2 ring-offset-2 ring-offset-card",
                  )}
                  style={{ backgroundColor: preset, ...(selected ? { ["--tw-ring-color" as string]: preset } : {}) }}
                >
                  {selected ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                </button>
              );
            })}
            <label
              title="Outra cor"
              className={cn(
                "relative ml-0.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition hover:border-primary/40 hover:text-primary",
                isCustom && "border-solid ring-2 ring-offset-2 ring-offset-card",
              )}
              style={isCustom ? { backgroundColor: current, color: "#fff", ["--tw-ring-color" as string]: current } : undefined}
            >
              <Pipette className="h-3.5 w-3.5" />
              <input
                id="pipeline-color"
                type="color"
                aria-label="Escolher cor do pipeline"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                value={safeColor(color)}
                onChange={(event) => onChange("color", event.target.value.toUpperCase())}
              />
            </label>
          </div>

          <button
            type="button"
            aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            aria-pressed={favorite}
            onClick={() => onChange("favorite", !favorite)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition",
              favorite
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-border text-muted-foreground hover:border-amber-300 hover:text-amber-700",
            )}
          >
            <Star className={cn("h-3.5 w-3.5", favorite && "fill-amber-400 text-amber-400")} />
            {favorite ? "Favorito" : "Favoritar"}
          </button>
        </div>
        {errors?.color ? <p className="text-xs text-destructive">{errors.color}</p> : null}
      </fieldset>
    </>
  );
}
