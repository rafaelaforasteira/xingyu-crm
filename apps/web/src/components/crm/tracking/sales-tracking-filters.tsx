"use client";

import * as React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrackingSelect } from "./tracking-select";
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
      contentClassName={`tracking-portal shadow-soft ${styles.panel}`}
      trigger={
        <Button
          type="button"
          size="icon"
          variant="secondary"
          data-tracking-control="filter"
          data-active={count > 0 ? "true" : "false"}
          className="relative h-9 w-9 shrink-0 rounded-full"
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
      <div className={"min-h-0 space-y-4 overflow-y-auto p-4 " + styles.scrollArea}>
        <TrackingPeriodSelector
          value={draftFilters.period}
          onChange={(period) => setDraftFilters((current) => ({ ...current, period }))}
        />
        <TrackingSelect
          id="tracking-customer-type"
          label="Tipo de cliente"
          value={draftFilters.customerType}
          options={[
            { value: "ALL", label: "Todos" },
            { value: "NEW", label: "Novos" },
            { value: "EXISTING", label: "Base existente" },
            { value: "REACTIVATED", label: "Reativados" },
          ]}
          onChange={(customerType) =>
            setDraftFilters((current) => ({
              ...current,
              customerType: customerType as TrackingFilters["customerType"],
            }))
          }
        />
        <TrackingSelect
          id="tracking-purchase-stage"
          label="Número da compra"
          value={draftFilters.purchaseStage}
          options={[
            { value: "ALL", label: "Todas" },
            ...[1, 2, 3, 4, 5].map((stage) => ({
              value: String(stage),
              label: stage + "ª compra",
            })),
            { value: "6+", label: "6ª compra ou mais" },
          ]}
          onChange={(purchaseStage) =>
            setDraftFilters((current) => ({
              ...current,
              purchaseStage: purchaseStage as TrackingFilters["purchaseStage"],
            }))
          }
        />
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
