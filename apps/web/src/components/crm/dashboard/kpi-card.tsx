"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDelta } from "@/lib/status-labels";

export function KpiCard({
  label,
  value,
  hint,
  delta,
  deltaTone = "neutral",
  progress,
  icon,
  href,
  loading,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  delta?: number | null;
  deltaTone?: "up" | "down" | "neutral";
  progress?: number | null;
  icon?: ReactNode;
  href?: string;
  loading?: boolean;
}) {
  const deltaLabel = formatDelta(delta ?? null);

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {icon}
          </div>
        ) : null}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
      )}
      <div className="mt-auto space-y-1 pt-2 text-xs text-muted-foreground">
        {deltaLabel ? (
          <p
            className={cn(
              deltaTone === "up" && "text-success",
              deltaTone === "down" && "text-destructive",
            )}
          >
            <strong>{deltaLabel}</strong>
            {typeof hint === "string" ? ` ${hint}` : null}
          </p>
        ) : hint ? (
          <p className="leading-snug">{hint}</p>
        ) : null}
      </div>
      {progress != null ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            aria-hidden
          />
        </div>
      ) : (
        <div className="mt-3 h-1.5" aria-hidden />
      )}
    </>
  );

  const cardClass =
    "flex h-full min-h-[140px] flex-col rounded-xl border-primary/10 bg-[hsl(262_45%_97%)] p-4 shadow-soft";

  if (href) {
    return (
      <Link
        href={href}
        className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card
          className={cn(
            cardClass,
            "transition hover:border-primary/25 hover:shadow-card",
          )}
        >
          {body}
        </Card>
      </Link>
    );
  }

  return <Card className={cardClass}>{body}</Card>;
}

export function formatKpiMoney(value?: number | null) {
  if (value == null) return "Dados indisponíveis";
  return formatCurrency(value);
}
