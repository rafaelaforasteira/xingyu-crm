"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type PopoverSelectOption = {
  value: string;
  label: string;
  /** Elemento à esquerda (avatar, bolinha de cor, bandeira…). */
  leading?: React.ReactNode;
};

/**
 * Select que abre em um popover sobre a página (não estica nem corta o formulário).
 * Mesma altura e borda dos campos de texto do formulário.
 */
export function PopoverSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Selecionar…",
  "aria-label": ariaLabel,
  invalid,
  disabled,
  footer,
  contentWidth = 260,
}: {
  id?: string;
  value: string;
  options: PopoverSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  invalid?: boolean;
  disabled?: boolean;
  /** Conteúdo extra no fim da lista (ex.: campo para adicionar uma opção). */
  footer?: (close: () => void) => React.ReactNode;
  contentWidth?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);
  const close = () => setOpen(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      contentWidth={contentWidth}
      className="grid w-full"
      aria-label={ariaLabel}
      trigger={
        <button
          id={id}
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "flex h-10 w-full items-center gap-2.5 rounded-xl border border-input bg-card px-3 text-left text-sm shadow-sm transition",
            "hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
            open && "border-primary/45 ring-2 ring-primary/15",
            invalid && !open && "border-destructive/60 ring-2 ring-destructive/10",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          {selected?.leading ? <span className="flex shrink-0 items-center">{selected.leading}</span> : null}
          <span className={cn("min-w-0 flex-1 truncate", selected ? "text-foreground" : "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      }
    >
      <div role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto p-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value || "__empty"}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => {
                onChange(option.value);
                close();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                active ? "bg-primary/[0.08] font-medium text-primary" : "text-foreground hover:bg-accent",
              )}
            >
              {option.leading ? <span className="flex shrink-0 items-center">{option.leading}</span> : null}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {active ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
      {footer ? <div className="border-t border-border/70 p-1.5">{footer(close)}</div> : null}
    </Popover>
  );
}
