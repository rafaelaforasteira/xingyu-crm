"use client";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Trend } from "./sales-tracking-types";
export { money, integer, days, compactMoney, dateBR, percentage } from "./tracking-format";
export function SalesTrend({ trend }: { trend: Trend | null }) {
  if (!trend)
    return <span className="text-[10px] text-muted-foreground">Sem base de comparação</span>;
  const Icon =
    trend.direction === "flat" ? Minus : trend.direction === "down" ? ArrowDown : ArrowUp;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[10px]">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
          trend.sentiment === "positive"
            ? "bg-success/10 text-success"
            : trend.sentiment === "negative"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        {trend.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
        {trend.suffix === "dias" ? " dias" : "%"}
      </span>
      <span className="text-muted-foreground">vs. período anterior</span>
    </span>
  );
}
