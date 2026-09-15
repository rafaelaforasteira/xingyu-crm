"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarRange = { startDate: string; endDate: string };

export function DateRangeCalendar({
  value,
  onChange,
}: {
  value: CalendarRange;
  onChange: (value: CalendarRange) => void;
}) {
  const today = new Date();
  const todayKey = format(today, "yyyy-MM-dd");
  const initial = value.startDate ? parseISO(value.startDate) : today;
  const [month, setMonth] = React.useState(startOfMonth(initial));
  const [focused, setFocused] = React.useState(format(initial, "yyyy-MM-dd"));
  const root = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) });
  const focusDate = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    if (key > todayKey) return;
    setMonth(startOfMonth(date));
    setFocused(key);
    requestAnimationFrame(() =>
      root.current?.querySelector<HTMLButtonElement>(`[data-date="${key}"]`)?.focus(),
    );
  };
  const selectDate = (key: string) => {
    setFocused(key);
    if (!value.startDate || value.endDate) onChange({ startDate: key, endDate: "" });
    else
      onChange({
        startDate: key < value.startDate ? key : value.startDate,
        endDate: key < value.startDate ? value.startDate : key,
      });
  };
  const moveMonth = (offset: number) => {
    const next = startOfMonth(addMonths(month, offset));
    setMonth(next);
    setFocused(format(next, "yyyy-MM-dd"));
  };
  return (
    <div ref={root} className="w-full" aria-label="Calendário de intervalo">
      <div className="mb-3 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-primary/10"
          aria-label="Mês anterior"
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>
        <p id={titleId} aria-live="polite" className="text-sm font-semibold capitalize">
          {format(month, "LLLL yyyy", { locale: ptBR })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-primary/10"
          aria-label="Próximo mês"
          disabled={isSameMonth(month, today)}
          onClick={() => moveMonth(1)}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div role="grid" aria-labelledby={titleId}>
        <div role="row" className="grid grid-cols-7">
          {[
            "domingo",
            "segunda-feira",
            "terça-feira",
            "quarta-feira",
            "quinta-feira",
            "sexta-feira",
            "sábado",
          ].map((day) => (
            <span
              key={day}
              role="columnheader"
              aria-label={day}
              className="py-2 text-center text-[11px] text-muted-foreground"
            >
              {day.charAt(0).toUpperCase()}
            </span>
          ))}
        </div>
        {Array.from({ length: days.length / 7 }, (_, week) => (
          <div key={week} role="row" className="grid grid-cols-7">
            {days.slice(week * 7, week * 7 + 7).map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const start = key === value.startDate;
              const end = key === value.endDate;
              const between = !!value.endDate && key > value.startDate && key < value.endDate;
              const selected = start || end || between;
              const future = key > todayKey;
              return (
                <div
                  key={key}
                  role="gridcell"
                  aria-selected={selected}
                  className={cn(
                    "my-0.5",
                    between && "bg-primary/10",
                    start && value.endDate && "rounded-l-lg bg-primary/10",
                    end && "rounded-r-lg bg-primary/10",
                  )}
                >
                  <button
                    type="button"
                    data-date={key}
                    disabled={future}
                    tabIndex={focused === key ? 0 : -1}
                    aria-label={`${format(day, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}${start ? ", início do intervalo" : ""}${end ? ", fim do intervalo" : ""}`}
                    aria-current={isSameDay(day, today) ? "date" : undefined}
                    onClick={() => selectDate(key)}
                    onKeyDown={(event) => {
                      let next: Date | undefined;
                      if (event.key === "ArrowLeft") next = addDays(day, -1);
                      if (event.key === "ArrowRight") next = addDays(day, 1);
                      if (event.key === "ArrowUp") next = addDays(day, -7);
                      if (event.key === "ArrowDown") next = addDays(day, 7);
                      if (event.key === "Home") next = startOfWeek(day);
                      if (event.key === "End") next = endOfWeek(day);
                      if (event.key === "PageUp") next = addMonths(day, -1);
                      if (event.key === "PageDown") next = addMonths(day, 1);
                      if (next) {
                        event.preventDefault();
                        focusDate(next > today ? today : next);
                      }
                    }}
                    className={cn(
                      "relative h-10 w-full rounded-lg text-sm transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-muted-foreground/30",
                      !future && "hover:bg-primary/10",
                      !isSameMonth(day, month) && !selected && "text-muted-foreground/40",
                      isSameDay(day, today) && "border border-primary/50",
                      between && "rounded-none text-primary",
                      (start || end) &&
                        "bg-primary font-semibold text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    {format(day, "d")}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
        {!value.startDate
          ? "Selecione a data inicial."
          : !value.endDate
            ? "Agora selecione a data final."
            : "Intervalo selecionado. Aplique os filtros para atualizar."}
      </p>
    </div>
  );
}
