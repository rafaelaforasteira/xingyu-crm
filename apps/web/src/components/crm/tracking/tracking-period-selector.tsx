"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrackingSelect } from "./tracking-select";
import { DateRangeCalendar } from "@/components/ui/date-range-calendar";
import type { TrackingDateRange, TrackingPeriod } from "./sales-tracking-types";

export function TrackingPeriodSelector({
  value,
  onChange,
}: {
  value: TrackingDateRange;
  onChange: (value: TrackingDateRange) => void;
}) {
  const displayDate = (date: string) =>
    date ? format(parseISO(date), "dd MMM yyyy", { locale: ptBR }).replace(".", "") : "Selecionar";
  return (
    <div className="space-y-2">
      <TrackingSelect
        id="tracking-period"
        label="Período"
        value={value.mode === "preset" ? value.preset : "custom"}
        options={[
          { value: "30d", label: "Últimos 30 dias" },
          { value: "90d", label: "Últimos 90 dias" },
          { value: "12m", label: "Últimos 12 meses" },
          { value: "custom", label: "Período personalizado" },
        ]}
        onChange={(preset) =>
          onChange(
            preset === "custom"
              ? { mode: "custom", startDate: "", endDate: "" }
              : { mode: "preset", preset: preset as TrackingPeriod },
          )
        }
      />
      {value.mode === "custom" && (
        <div className="space-y-3 rounded-xl border border-border bg-background p-2">
          <div className="grid grid-cols-2 gap-2 px-1 pt-1 text-xs" aria-live="polite">
            <div>
              <span className="block text-muted-foreground">De</span>
              <span className="font-medium">{displayDate(value.startDate)}</span>
            </div>
            <div>
              <span className="block text-muted-foreground">Até</span>
              <span className="font-medium">{displayDate(value.endDate)}</span>
            </div>
          </div>
          <DateRangeCalendar
            value={value}
            onChange={(range) => onChange({ mode: "custom", ...range })}
          />
        </div>
      )}
    </div>
  );
}
