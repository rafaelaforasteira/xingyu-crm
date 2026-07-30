"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { KanbanBoard } from "@/components/crm/kanban-board";
import { DealWorkspaceDrawer } from "@/components/crm/deal-workspace";
import { useUiStore } from "@/stores/ui";
import type { Deal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Kanban } from "lucide-react";

export function PipelinesListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.pipelines.all,
    queryFn: () => pipelinesApi.list(),
    retry: false,
  });

  return (
    <div>
      <PageHeader title="Pipelines" description="Funis de vendas da operação." />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="Nenhum pipeline"
          description="A API não retornou pipelines."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((p) => (
            <Link key={p.id} href={`/pipelines/${p.id}`}>
              <Card className="h-full transition hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>{p.name}</span>
                    {p.isDefault ? <Badge>Padrão</Badge> : null}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {p.description || "Sem descrição"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {p.dealsCount ?? p.stages?.reduce((n, s) => n + (s.deals?.length ?? 0), 0) ?? 0}{" "}
                    negócios
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PipelineBoardPage({ pipelineId }: { pipelineId: string }) {
  const router = useRouter();
  const openDealDrawer = useUiStore((s) => s.openDealDrawer);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.pipelines.board(pipelineId),
    queryFn: () => pipelinesApi.board(pipelineId),
    retry: false,
  });

  const onOpenDeal = (deal: Deal) => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      router.push(`/pipelines/${pipelineId}/deals/${deal.id}`);
      return;
    }
    openDealDrawer(deal.id);
  };

  return (
    <div>
      <PageHeader
        title={data?.name ?? "Pipeline"}
        description={data?.description ?? "Quadro Kanban"}
        actions={
          <Link href="/pipelines" className="text-sm text-primary hover:underline">
            Todos os pipelines
          </Link>
        }
      />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? <Skeleton className="h-96 w-full" /> : null}
      {data ? <KanbanBoard pipeline={data} onOpenDeal={onOpenDeal} /> : null}
      <DealWorkspaceDrawer />
    </div>
  );
}
