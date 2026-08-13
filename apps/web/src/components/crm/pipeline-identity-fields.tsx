"use client";

import * as React from "react";
import { Check, ChevronDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="space-y-1">
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

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Identidade visual
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.35fr)_minmax(8rem,1fr)_6.5rem]">
          <div className="space-y-1">
            <Label htmlFor="pipeline-color">Cor</Label>
            <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-2 focus-within:ring-2 focus-within:ring-ring">
              <input
                id="pipeline-color"
                type="color"
                aria-label="Escolher cor do pipeline"
                className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"
                value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#7c3aed"}
                onChange={(event) => onChange("color", event.target.value.toUpperCase())}
              />
              <Input
                aria-label="Código da cor"
                className="h-8 border-0 px-1 font-mono shadow-none focus-visible:ring-0"
                value={color}
                maxLength={7}
                onChange={(event) => onChange("color", event.target.value.toUpperCase())}
              />
            </div>
            {errors?.color ? <p className="text-xs text-destructive">{errors.color}</p> : null}
          </div>

          <div className="space-y-1">
            <Label>Ícone</Label>
            <Popover
              open={iconPickerOpen}
              onOpenChange={setIconPickerOpen}
              align="start"
              contentWidth={304}
              aria-label="Escolher ícone do pipeline"
              trigger={
                <Button
                  type="button"
                  variant="outline"
                  aria-label="Escolher ícone do pipeline"
                  aria-expanded={iconPickerOpen}
                  className="h-10 w-full justify-between"
                  onClick={() => setIconPickerOpen((current) => !current)}
                >
                  <SelectedIcon className="h-5 w-5" style={{ color }} />
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
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

          <div className="space-y-1">
            <Label>Favorito</Label>
            <Button
              type="button"
              variant={favorite ? "secondary" : "outline"}
              className="h-10 w-full"
              aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              aria-pressed={favorite}
              title={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              onClick={() => onChange("favorite", !favorite)}
            >
              <Star className={cn("h-5 w-5", favorite && "fill-current text-primary")} />
            </Button>
          </div>
        </div>
      </fieldset>
    </>
  );
}
