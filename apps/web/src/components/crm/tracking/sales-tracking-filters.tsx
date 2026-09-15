"use client";

import * as React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-controls";
import { Popover } from "@/components/ui/popover";
import { TrackingPeriodSelector } from "./tracking-period-selector";
import type { TrackingFilters } from "./sales-tracking-types";
import styles from "./sales-tracking-filters.module.css";

export const DEFAULT_TRACKING_FILTERS: TrackingFilters = {
  period: { mode: "preset", preset: "30d" },
  customerType: "ALL",
  purchaseStage: "ALL",
};

export function SalesTrackingFilters({
  appliedFilters,
  onApply,
}: {
  appliedFilters: TrackingFilters;
  onApply: (filters: TrackingFilters) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draftFilters, setDraftFilters] = React.useState(appliedFilters);
  const handleOpen = (next: boolean) => {
    if (next) setDraftFilters(structuredClone(appliedFilters));
    setOpen(next);
  };
  const count =
    Number(appliedFilters.period.mode !== "preset" || appliedFilters.period.preset !== "30d") +
    Number(appliedFilters.customerType !== "ALL") +
    Number(appliedFilters.purchaseStage !== "ALL");
  const range = draftFilters.period;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const valid =
    range.mode === "preset" ||
    (!!range.startDate &&
      !!range.endDate &&
      range.startDate <= range.endDate &&
      range.endDate <= todayKey);
  return (
    <Popover
      open={open}
      onOpenChange={handleOpen}
      mobileSheet
      contentWidth={360}
      align="end"
      aria-label="Filtros de vendas"
      contentClassName={`shadow-soft ${styles.panel}`}
      trigger={
        <Button
          type="button"
          size="icon"
          className="relative h-9 w-9 shrink-0 rounded-full active:bg-primary/80"
          aria-label="Filtrar dados de vendas"
          title="Filtrar dados"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => handleOpen(!open)}
        >
          <Filter className="h-4 w-4" aria-hidden />
          {count > 0 && (
            <span
              aria-label={`${count} filtros ativos`}
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-card bg-primary px-0.5 text-[9px] font-semibold text-primary-foreground"
            >
              {count}
            </span>
          )}
        </Button>
      }
    >
      <div className="flex shrink-0 items-start justify-between border-b border-border/70 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Filtros</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Refine os dados desta análise</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full"
          aria-label="Fechar filtros"
          onClick={() => handleOpen(false)}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className="min-h-0 space-y-4 overflow-y-auto p-4">
        <TrackingPeriodSelector
          value={draftFilters.period}
          onChange={(period) => setDraftFilters((current) => ({ ...current, period }))}
        />
        <div className="space-y-2">
          <Label htmlFor="tracking-customer-type" className="text-xs">
            Tipo de cliente
          </Label>
          <Select
            id="tracking-customer-type"
            value={draftFilters.customerType}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                customerType: event.target.value as TrackingFilters["customerType"],
              }))
            }
          >
            <option value="ALL">Todos</option>
            <option value="NEW">Novos</option>
            <option value="EXISTING">Antigos</option>
            <option value="REACTIVATED">Reativados</option>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tracking-purchase-stage" className="text-xs">
            Número da compra
          </Label>
          <Select
            id="tracking-purchase-stage"
            value={draftFilters.purchaseStage}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                purchaseStage: event.target.value as TrackingFilters["purchaseStage"],
              }))
            }
          >
            <option value="ALL">Todas</option>
            {[1, 2, 3, 4, 5].map((stage) => (
              <option key={stage} value={stage}>
                {stage}ª compra
              </option>
            ))}
            <option value="6+">6ª compra ou mais</option>
          </Select>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-border/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDraftFilters(structuredClone(DEFAULT_TRACKING_FILTERS))}
        >
          Limpar
        </Button>
        <Button
          type="button"
          className="flex-1"
          disabled={!valid}
          onClick={() => {
            if (!valid) return;
            onApply(structuredClone(draftFilters));
            setOpen(false);
          }}
        >
          Aplicar filtros
        </Button>
      </div>
    </Popover>
  );
}
