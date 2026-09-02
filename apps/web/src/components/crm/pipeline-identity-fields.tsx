"use client";

import * as React from "react";
import { Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/form-controls";
import { Popover } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  PIPELINE_ICON_OPTIONS,
  resolvePipelineIcon,
} from "@/lib/pipeline-icons";
import { cn } from "@/lib/utils";

export const PIPELINE_DESCRIPTION_MAX_LENGTH = 140;

export function PipelineIdentityFields({
  description,
  color,
  icon,
  favorite,
  errors,
  onChange,
}: {
  description: string;
  color: string;
  icon: string;
  favorite: boolean;
  errors?: { description?: string; color?: string; icon?: string };
  onChange: (field: "description" | "color" | "icon" | "favorite", value: string | boolean) => void;
}) {
  const [iconPickerOpen, setIconPickerOpen] = React.useState(false);
  const SelectedIcon = resolvePipelineIcon(icon);
  const descriptionCounterId = React.useId();

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="pipeline-description">Descrição</Label>
        <Textarea
          id="pipeline-description"
          rows={3}
          maxLength={description.length <= PIPELINE_DESCRIPTION_MAX_LENGTH ? PIPELINE_DESCRIPTION_MAX_LENGTH : undefined}
          aria-describedby={descriptionCounterId}
          aria-invalid={Boolean(errors?.description)}
          placeholder="Explique quando este pipeline deve ser usado."
          value={description}
          onChange={(event) => onChange("description", event.target.value)}
        />
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-destructive">{errors?.description}</p>
          <p
            id={descriptionCounterId}
            className={cn(
              "ml-auto text-xs text-muted-foreground",
              description.length > PIPELINE_DESCRIPTION_MAX_LENGTH && "text-destructive",
              description.length >= 125 && description.length <= PIPELINE_DESCRIPTION_MAX_LENGTH && "text-foreground",
            )}
          >
            {description.length}/{PIPELINE_DESCRIPTION_MAX_LENGTH}
          </p>
        </div>
      </div>

      <fieldset className="rounded-xl border border-border bg-muted/20 p-4">
        <legend className="sr-only">Identidade visual</legend>
        <div className="flex items-end gap-8">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="pipeline-color" className="block">Cor</Label>
            <label
              className="relative block h-10 w-10 cursor-pointer rounded-full border-4 border-card shadow-[0_0_0_1px_hsl(var(--border))] transition-transform hover:scale-105 focus-within:ring-2 focus-within:ring-primary/25"
              style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(color) ? color : "#7c3aed" }}
            >
              <input
                id="pipeline-color"
                type="color"
                aria-label="Escolher cor do pipeline"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#7c3aed"}
                onChange={(event) => onChange("color", event.target.value.toUpperCase())}
              />
            </label>
            {errors?.color ? <p className="text-xs text-destructive">{errors.color}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label className="block">Ícone</Label>
            <Popover
              open={iconPickerOpen}
              onOpenChange={setIconPickerOpen}
              align="start"
              contentWidth={304}
              aria-label="Escolher ícone do pipeline"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Escolher ícone do pipeline"
                  aria-expanded={iconPickerOpen}
                  className="h-10 w-10 rounded-full border border-border bg-card p-0 text-primary shadow-sm hover:border-primary/35 hover:bg-primary/5"
                  onClick={() => setIconPickerOpen((current) => !current)}
                >
                  <SelectedIcon className="h-5 w-5" style={{ color }} />
                </Button>
              }
            >
              <div className="grid max-h-64 grid-cols-5 gap-1 overflow-y-auto p-3">
                {PIPELINE_ICON_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = option.key === icon;
                  return (
                    <Button
                      key={option.key}
                      type="button"
                      variant={selected ? "secondary" : "ghost"}
                      size="icon"
                      title={option.label}
                      aria-label={option.label}
                      aria-pressed={selected}
                      className="relative h-10 w-10"
                      onClick={() => {
                        onChange("icon", option.key);
                        setIconPickerOpen(false);
                      }}
                    >
                      <Icon className="h-5 w-5" />
                      {selected ? <Check className="absolute right-0.5 top-0.5 h-3 w-3" /> : null}
                    </Button>
                  );
                })}
              </div>
            </Popover>
            {errors?.icon ? <p className="text-xs text-destructive">{errors.icon}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label className="block">Preferência</Label>
            <button
              type="button"
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border bg-card transition-colors",
                favorite
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border text-muted-foreground shadow-sm hover:border-primary/35 hover:bg-primary/5 hover:text-primary",
              )}
              aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              aria-pressed={favorite}
              onClick={() => onChange("favorite", !favorite)}
            >
              <Star className={cn("h-5 w-5", favorite && "fill-current")} />
            </button>
          </div>
        </div>
      </fieldset>
    </>
  );
}
