"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { UsersRound } from "lucide-react";
import { PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

import { Skeleton } from "@/components/ui/skeleton";
import {
  CustomerHealth,
  CustomerOrigin,
  PurchaseStageChart,
  RelationshipFlow,
  RepurchaseAnalysis,
  SalesHero,
  ValueAndReactivation,
} from "./sales-tracking-visuals";
import { TrackedCustomersTable } from "./tracked-customers-table";
import { SalesTrackingFilters, DEFAULT_TRACKING_FILTERS } from "./sales-tracking-filters";
import { getSalesTrackingData } from "./sales-tracking-service";
import type { TrackingFilters } from "./sales-tracking-types";

export function SalesTrackingPage() {
  const [appliedFilters, setAppliedFilters] =
    React.useState<TrackingFilters>(DEFAULT_TRACKING_FILTERS);
  const query = useQuery({
    queryKey: ["tracking", "sales", appliedFilters],
    queryFn: () => getSalesTrackingData(appliedFilters),
    placeholderData: (previous) => previous,
    retry: false,
  });
  const data = query.data;
  return (
    <div className="space-y-4">
      <PageHeader
        title="Inteligência de Vendas"
        description="Entenda quem comprou, quanto esses clientes valem e como se comportam ao longo do tempo."
        className="flex-row items-start [&>div:last-child]:shrink-0"
        actions={
          <SalesTrackingFilters appliedFilters={appliedFilters} onApply={setAppliedFilters} />
        }
      />

      {query.isError ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <p className="font-semibold">Não foi possível carregar os dados de vendas.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tente novamente em alguns instantes.
            </p>
            <Button className="mt-4" size="sm" onClick={() => query.refetch()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : null}
      {query.isLoading && !data ? <TrackingSkeleton /> : null}
      {data ? (
        <div
          className={
            query.isFetching
              ? "space-y-4 opacity-60 transition-opacity"
              : "space-y-4 transition-opacity"
          }
          aria-busy={query.isFetching}
        >
          <SalesHero data={data} />
          <div className="grid gap-3 xl:grid-cols-2">
            <PurchaseStageChart data={data} />
            <CustomerOrigin data={data} />
          </div>
          <RepurchaseAnalysis data={data} />
          <RelationshipFlow data={data} />
          <ValueAndReactivation data={data} />
          <CustomerHealth data={data} />
          {data.customers.length ? (
            <TrackedCustomersTable customers={data.customers} />
          ) : (
            <EmptyState
              icon={UsersRound}
              title="Nenhuma venda encontrada neste período."
              description="Altere o período ou os filtros para visualizar outros dados."
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function TrackingSkeleton() {
  return (
    <div className="space-y-4" aria-label="Carregando inteligência de vendas">
      <div className="overflow-hidden rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.7fr_0.8fr]">
          <Skeleton className="h-[350px] rounded-xl" />
          <Skeleton className="h-[350px] rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
