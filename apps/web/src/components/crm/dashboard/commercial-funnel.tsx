"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FunnelStagePoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Kanban } from "lucide-react";

export function CommercialFunnel({
  stages,
  stats,
  loading,
  pipelineHref = "/pipelines",
}: {
  stages: FunnelStagePoint[];
  stats?: {
    avgCloseDays: number | null;
    averageTicket: number;
    lostValue: number;
  };
  loading?: boolean;
  pipelineHref?: string;
}) {
  const router = useRouter();

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Funil comercial</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Quantidade, valor e conversão por etapa
          </p>
        </div>
        <Link href={pipelineHref} className="text-sm font-semibold text-primary hover:underline">
          Ver pipeline
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : stages.length === 0 ? (
          <EmptyState
            icon={Kanban}
            title="Nenhuma etapa disponível"
            description="Selecione um pipeline com etapas cadastradas para visualizar o funil."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <>
            <div className="space-y-2.5">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  className="grid w-full grid-cols-[96px_1fr_48px] items-center gap-2 text-left sm:grid-cols-[112px_1fr_54px]"
                  onClick={() => router.push(`/pipelines/${stage.pipelineId}?stageId=${stage.id}`)}
                >
                  <span className="truncate text-xs text-muted-foreground">{stage.label}</span>
                  <div className="h-8 overflow-hidden rounded-lg bg-muted">
                    <div
                      className="flex h-full items-center rounded-lg bg-gradient-to-r from-primary to-primary/70 px-2.5 text-[11px] font-semibold text-primary-foreground"
                      style={{ width: `${stage.barWidthPct}%` }}
                    >
                      <span className="truncate">
                        {stage.count} · {formatCurrency(stage.value)}
                      </span>
                    </div>
                  </div>
                  <span className="text-right text-xs font-semibold">
                    {stage.conversionFromPrevious}%
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-muted/60 p-2.5">
                <p className="text-[11px] text-muted-foreground">Tempo para fechar</p>
                <p className="mt-1 text-sm font-semibold">
                  {stats?.avgCloseDays != null
                    ? `${stats.avgCloseDays} dias`
                    : "Dados indisponíveis"}
                </p>
              </div>
              <div className="rounded-xl bg-muted/60 p-2.5">
                <p className="text-[11px] text-muted-foreground">Ticket médio</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatCurrency(stats?.averageTicket ?? 0)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/60 p-2.5">
                <p className="text-[11px] text-muted-foreground">Perdas no período</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatCurrency(stats?.lostValue ?? 0)}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
