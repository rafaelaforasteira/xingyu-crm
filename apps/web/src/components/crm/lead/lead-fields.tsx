"use client";

import * as React from "react";
import type { CountryCode } from "libphonenumber-js";
import { Check, ChevronDown, CircleAlert, Plus } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import { PopoverSelect } from "@/components/ui/popover-select";
import {
  PHONE_COUNTRIES,
  PHONE_PLACEHOLDERS,
  checkPhone,
  dialCode,
  formatNationalAsYouType,
  type PhoneCheck,
} from "@/lib/phone-input";
import { centsFromInput, formatCents } from "@/lib/currency-input";
import { cn } from "@/lib/utils";

export const FIELD_CLASS =
  "h-10 rounded-xl bg-card focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/45";

/** Telefone com seletor de país e validação de número real. */
export function PhoneField({
  id,
  country,
  national,
  onChange,
  showError,
  onBlur,
}: {
  id: string;
  country: CountryCode;
  national: string;
  onChange: (next: { country: CountryCode; national: string }) => void;
  showError: boolean;
  onBlur?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const check: PhoneCheck = checkPhone(national, country);
  const current = PHONE_COUNTRIES.find((item) => item.code === country) ?? PHONE_COUNTRIES[0]!;
  const error = showError && !check.valid && check.reason !== "empty";

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex h-10 items-stretch rounded-xl border border-input bg-card shadow-sm transition",
          "focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15",
          error && "border-destructive/60 ring-2 ring-destructive/10",
        )}
      >
        <Popover
          open={open}
          onOpenChange={setOpen}
          align="start"
          contentWidth={240}
          aria-label="País do telefone"
          trigger={
            <button
              type="button"
              aria-label={`País: ${current.name} (${dialCode(current.code)})`}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="flex h-full items-center gap-1.5 rounded-l-xl border-r border-input pl-3 pr-2 text-sm transition hover:bg-accent focus-visible:outline-none"
            >
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground" aria-hidden>{current.code}</span>
              <span className="font-medium tabular-nums text-foreground">{dialCode(current.code)}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            </button>
          }
        >
          <div role="listbox" aria-label="País do telefone" className="max-h-64 overflow-y-auto p-1.5">
            {PHONE_COUNTRIES.map((item) => {
              const active = item.code === country;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange({ country: item.code, national: formatNationalAsYouType(national, item.code) });
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    active ? "bg-primary/[0.08] font-medium text-primary" : "hover:bg-accent",
                  )}
                >
                  <span className="w-7 shrink-0 rounded-md bg-muted px-1 py-0.5 text-center text-[10px] font-semibold tracking-wide text-muted-foreground" aria-hidden>{item.code}</span>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="tabular-nums text-muted-foreground">{dialCode(item.code)}</span>
                  {active ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </Popover>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          autoFocus
          aria-invalid={error || undefined}
          aria-describedby={`${id}-hint`}
          value={national}
          placeholder={PHONE_PLACEHOLDERS[country] ?? "Número com código de área"}
          onChange={(event) => onChange({ country, national: formatNationalAsYouType(event.target.value, country) })}
          onBlur={onBlur}
          className="min-w-0 flex-1 rounded-r-xl bg-transparent px-3 text-sm tabular-nums outline-none placeholder:text-muted-foreground"
        />
        {check.valid ? (
          <span className="flex items-center pr-3 text-emerald-600" title="Número válido">
            <Check className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p id={`${id}-hint`} className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
        {error
          ? check.reason === "incomplete"
            ? "Número incompleto. Confira o DDD e todos os dígitos."
            : "Esse número não existe. Confira o DDD/código de área e os dígitos."
          : check.valid
            ? `Será salvo como ${check.international}`
            : "Escolha o país e digite o número com DDD."}
      </p>
    </div>
  );
}

/** Valor em reais: digita só números e eles entram como centavos. */
export function CurrencyField({
  id,
  cents,
  onChange,
}: {
  id: string;
  cents: number | null;
  onChange: (cents: number | null) => void;
}) {
  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      placeholder="R$ 0,00"
      value={formatCents(cents)}
      onChange={(event) => onChange(centsFromInput(event.target.value))}
      onKeyDown={(event) => {
        if (event.key === "Backspace" && cents != null) {
          event.preventDefault();
          const next = Math.floor(cents / 10);
          onChange(next > 0 ? next : null);
        }
      }}
      className={cn(
        "flex w-full border border-input px-3 text-sm tabular-nums shadow-sm outline-none transition placeholder:text-muted-foreground",
        FIELD_CLASS,
      )}
    />
  );
}

const DEFAULT_SOURCES = ["Indicação", "Evento", "Ligação", "Loja física", "Instagram", "WhatsApp", "Site"];
const CUSTOM_SOURCES_KEY = "xingyu:lead-custom-sources";

function readCustomSources(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(CUSTOM_SOURCES_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Origem: lista pronta + origens que a pessoa já adicionou + campo para adicionar outra. */
export function SourceField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [custom, setCustom] = React.useState<string[]>([]);
  const [draft, setDraft] = React.useState("");
  React.useEffect(() => setCustom(readCustomSources()), []);

  const all = Array.from(new Set([...DEFAULT_SOURCES, ...custom, ...(value ? [value] : [])]));
  const options = [
    { value: "", label: "Não informada" },
    ...all.map((item) => ({ value: item, label: item })),
  ];

  const add = (close: () => void) => {
    const cleaned = draft.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!cleaned) return;
    const existing = all.find((item) => item.localeCompare(cleaned, "pt-BR", { sensitivity: "base" }) === 0);
    if (!existing) {
      const next = [...custom, cleaned];
      setCustom(next);
      try {
        localStorage.setItem(CUSTOM_SOURCES_KEY, JSON.stringify(next));
      } catch {
        /* sem armazenamento: a origem vale só para este lead */
      }
    }
    onChange(existing ?? cleaned);
    setDraft("");
    close();
  };

  return (
    <PopoverSelect
      id={id}
      aria-label="Origem informada"
      value={value}
      options={options}
      onChange={onChange}
      placeholder="Não informada"
      footer={(close) => (
        <div className="flex items-center gap-1.5">
          <input
            aria-label="Nova origem"
            value={draft}
            maxLength={60}
            placeholder="Adicionar outra origem…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add(close);
              }
            }}
            className="h-8 min-w-0 flex-1 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15"
          />
          <button
            type="button"
            aria-label="Adicionar origem"
            disabled={!draft.trim()}
            onClick={() => add(close)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    />
  );
}

export function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
      <CircleAlert className="h-3.5 w-3.5" aria-hidden />
      {children}
    </p>
  );
}
