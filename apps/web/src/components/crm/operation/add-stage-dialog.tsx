"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-controls";
import {
  STAGE_COLOR_PRESETS,
  isValidStageName,
  sanitizeStageName,
} from "@/lib/operation-utils";
import { cn } from "@/lib/utils";

export function AddStageDialog({
  open,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; color: string }) => Promise<void> | void;
}) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState<string>(STAGE_COLOR_PRESETS[1]);
  const [error, setError] = React.useState<string | null>(null);
  const nameRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setColor(STAGE_COLOR_PRESETS[1]);
    setError(null);
    const timer = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = sanitizeStageName(name);
    if (!isValidStageName(cleaned)) {
      setError("Informe um nome válido para a coluna (até 80 caracteres).");
      return;
    }
    setError(null);
    try {
      await onSubmit({ name: cleaned, color });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível criar a coluna.",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adicionar coluna"
      description="Crie uma nova etapa para organizar os leads deste pipeline."
    >
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <div className="space-y-1.5">
          <Label htmlFor="operation-stage-name">Nome da coluna</Label>
          <Input
            ref={nameRef}
            id="operation-stage-name"
            data-testid="add-stage-name"
            value={name}
            maxLength={80}
            placeholder="Ex.: Proposta enviada"
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(error)}
          />
        </div>

        <div className="space-y-1.5">
          <Label id="operation-stage-color-label">Cor</Label>
          <div
            className="flex flex-wrap gap-2"
            role="listbox"
            aria-labelledby="operation-stage-color-label"
            data-testid="add-stage-colors"
          >
            {STAGE_COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                role="option"
                aria-selected={color === preset}
                aria-label={`Cor ${preset}`}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-transform",
                  color === preset
                    ? "scale-110 border-foreground"
                    : "border-transparent opacity-80 hover:opacity-100",
                )}
                style={{ backgroundColor: preset }}
                onClick={() => setColor(preset)}
              />
            ))}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            data-testid="add-stage-submit"
            disabled={pending}
          >
            {pending ? "Adicionando…" : "Adicionar coluna"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
