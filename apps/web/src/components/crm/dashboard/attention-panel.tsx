"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type AlertTone = "danger" | "warning" | "info" | "success";

const toneClass: Record<AlertTone, string> = {
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning-foreground",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
};

export function AttentionPanel({
  loading,
  alerts,
}: {
  loading?: boolean;
  alerts: { id: string; count: number; label: string; href: string; tone: AlertTone }[];
}) {
  const visible = alerts.filter((alert) => alert.count > 0).slice(0, 5);

  return (
    <Card className="flex flex-col gap-4 rounded-xl p-4 shadow-soft md:flex-row md:items-center">
      <div className="min-w-[180px]">
        <p className="font-semibold">Precisa da sua atenção</p>
        <p className="text-xs text-muted-foreground">Prioridades organizadas por impacto.</p>
      </div>
      {loading ? (
        <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="flex-1 text-sm text-muted-foreground">
          Nenhuma prioridade urgente no momento. Continue acompanhando a operação.
        </p>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((alert) => (
            <Link
              key={alert.id}
              href={alert.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                toneClass[alert.tone],
              )}
            >
              <span className="text-lg font-bold">{alert.count}</span>
              <span className="text-xs font-medium leading-snug">{alert.label}</span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
