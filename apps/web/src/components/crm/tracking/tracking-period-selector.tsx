"use client";

import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, Label } from "@/components/ui/form-controls";
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
      <Label htmlFor="tracking-period" className="text-xs">
        Período
      </Label>
      <Select
        id="tracking-period"
        value={value.mode === "preset" ? value.preset : "custom"}
        onChange={(event) =>
          onChange(
            event.target.value === "custom"
              ? { mode: "custom", startDate: "", endDate: "" }
              : { mode: "preset", preset: event.target.value as TrackingPeriod },
          )
        }
      >
        <option value="30d">Últimos 30 dias</option>
        <option value="90d">Últimos 90 dias</option>
        <option value="12m">Últimos 12 meses</option>
        <option value="custom">Período personalizado</option>
      </Select>
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
