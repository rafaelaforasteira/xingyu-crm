"use client";
import * as React from "react";
import { Filter, X } from "lucide-react";
import type { RecoveryOverviewData } from "@xingyu/types";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { TrackingSelect } from "../tracking-select";
import { TrackingPeriodSelector } from "../tracking-period-selector";
import { CHANNEL_LABELS } from "../channel-origin-config";
import {
  DEFAULT_RECOVERY_FILTERS,
  METHOD_LABELS,
  recoveryQuery,
  type RecoveryFilters,
} from "./recovery-service";
import panel from "../sales-tracking-filters.module.css";

export function RecoveryFiltersPanel({
  applied,
  onApply,
  options,
}: {
  applied: RecoveryFilters;
  onApply: (filters: RecoveryFilters) => void;
  options?: RecoveryOverviewData["filterOptions"];
}) {
  const [open, setOpen] = React.useState(false),
    [draft, setDraft] = React.useState(applied);
  const handleOpen = (value: boolean) => {
    if (value) setDraft(structuredClone(applied));
    setOpen(value);
  };
  let valid = true;
  try {
    recoveryQuery(draft);
  } catch {
    valid = false;
  }
  const count =
    [
      applied.status,
      applied.method,
      applied.customerType,
      applied.valueBand,
      applied.channel,
    ].filter((v) => v !== "ALL").length +
    Number(applied.period.mode !== "preset" || applied.period.preset !== "30d");
  const field = (
    key: Exclude<keyof RecoveryFilters, "period">,
    label: string,
    values: Array<{ value: string; label: string }>,
  ) => (
    <TrackingSelect
      id={"recovery-filter-" + key}
      label={label}
      value={draft[key]}
      options={[{ value: "ALL", label: "Todos" }, ...values]}
      onChange={(value) => setDraft((current) => ({ ...current, [key]: value }))}
    />
  );
  return (
    <Popover
      open={open}
      onOpenChange={handleOpen}
      mobileSheet
      contentWidth={380}
      align="end"
      aria-label="Filtros de recuperação"
      contentClassName={`tracking-portal shadow-soft ${panel.panel}`}
      trigger={
        <Button
          type="button"
          variant="secondary"
          size="icon"
          data-tracking-control="filter"
          aria-label="Filtrar recuperação"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => handleOpen(!open)}
          className="relative h-9 w-9 rounded-full"
        >
          <Filter className="h-4 w-4" />
          {count > 0 && (
            <span
              className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground"
              aria-label={`${count} filtros ativos`}
            >
              {count}
            </span>
          )}
        </Button>
      }
    >
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Filtros</h2>
          <p className="mt-1 text-xs text-muted-foreground">Coorte pela data de abandono</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Fechar filtros"
          onClick={() => handleOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className={"min-h-0 space-y-4 overflow-y-auto p-4 " + panel.scrollArea}>
        <TrackingPeriodSelector
          value={draft.period}
          onChange={(period) => setDraft((c) => ({ ...c, period }))}
        />
        {field("status", "Status", [
          { value: "OPEN", label: "Em aberto" },
          { value: "RECOVERED", label: "Recuperado" },
          { value: "EXPIRED", label: "Expirado" },
        ])}
        {field(
          "method",
          "Método de recuperação",
          Object.entries(METHOD_LABELS)
            .filter(([value]) => value !== "MIXED")
            .map(([value, label]) => ({ value, label })),
        )}
        {field("customerType", "Tipo de cliente", [
          { value: "NEW", label: "Novo" },
          { value: "EXISTING", label: "Base existente" },
          { value: "UNKNOWN", label: "Não identificado" },
        ])}
        {field(
          "valueBand",
          "Faixa de valor",
          (options?.valueBands ?? []).map((b) => ({ value: b.key, label: b.label })),
        )}
        {field(
          "channel",
          "Origem / canal",
          (options?.channels ?? []).map((c) => ({ value: c, label: CHANNEL_LABELS[c] })),
        )}
        <p className="text-[11px] text-muted-foreground">
          Método é a evidência da intervenção. Canal representa a aquisição. Filtrar pelo resultado
          não cria uma taxa de conversão por método.
        </p>
        {!valid && (
          <p role="alert" className="text-xs text-destructive">
            Selecione datas válidas, sem datas futuras.
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-2 border-t border-border p-4">
        <Button variant="ghost" onClick={() => setDraft(structuredClone(DEFAULT_RECOVERY_FILTERS))}>
          Limpar
        </Button>
        <Button
          className="flex-1"
          disabled={!valid}
          onClick={() => {
            if (valid) {
              onApply(structuredClone(draft));
              setOpen(false);
            }
          }}
        >
          Aplicar filtros
        </Button>
      </div>
    </Popover>
  );
}
