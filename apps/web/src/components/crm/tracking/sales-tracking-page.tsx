"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

import { Skeleton } from "@/components/ui/skeleton";
import {
  CustomerMix,
  RepurchaseAnalysis,
  SalesHero,
  ValueAndReactivation,
} from "./sales-tracking-visuals";
import { toast } from "sonner";
import { createTrackingRefresh } from "./tracking-refresh";
import { TrackingMotion } from "./tracking-motion";
import { SalesTrackingFilters, DEFAULT_TRACKING_FILTERS } from "./sales-tracking-filters";
import { getSalesTrackingData } from "./sales-tracking-service";
import type { TrackingFilters } from "./sales-tracking-types";
import { ChannelOriginSection } from "./channel-origin-section";
import { dateBR } from "./tracking-format";
import styles from "./tracking-overview.module.css";

export function SalesTrackingPage() {
  const [appliedFilters, setAppliedFilters] =
    React.useState<TrackingFilters>(DEFAULT_TRACKING_FILTERS);
  const query = useQuery({
    queryKey: ["tracking", "sales", appliedFilters],
    queryFn: () => getSalesTrackingData(appliedFilters),
    placeholderData: (previous) => previous,
    retry: false,
  });
  const lastValid = React.useRef(query.data);
  React.useEffect(() => {
    if (query.data) lastValid.current = query.data;
  }, [query.data]);
  const data = query.data ?? lastValid.current;
  const runner = React.useRef(createTrackingRefresh());
  const [refreshing, setRefreshing] = React.useState(false);
  const fetching = query.isFetching || refreshing;
  const refresh = () =>
    runner.current({
      isFetching: query.isFetching,
      refetch: () => query.refetch({ cancelRefetch: false }),
      onPending: setRefreshing,
      onSuccess: () => toast.success("Dados atualizados"),
      onError: () => toast.error("Não foi possível atualizar os dados."),
    });
  return (
    <div className={styles.page + " space-y-4"}>
      <p className="text-xs font-medium text-muted-foreground">
        Tracking <span className="mx-1 text-border">/</span> Visão Geral
      </p>
      <PageHeader
        title="Inteligência de Vendas"
        description="Entenda quanto foi vendido, de onde vieram as vendas, quem comprou e como esses clientes se comportam ao longo do tempo."
        className="flex-row items-start [&>div:last-child]:shrink-0"
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary shadow-sm hover:bg-primary/15 active:bg-primary/20"
              aria-label="Atualizar dados da análise"
              title="Atualizar dados"
              disabled={fetching}
              onClick={refresh}
            >
              <RefreshCw aria-hidden className={"h-4 w-4 " + (fetching ? styles.refresh : "")} />
            </Button>
            <SalesTrackingFilters appliedFilters={appliedFilters} onApply={setAppliedFilters} />
          </div>
        }
      />

      {query.isError && !data ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <p className="font-semibold">Não foi possível carregar os dados de Tracking.</p>
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
        <>
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
            aria-live="polite"
          >
            <span>
              {dateBR(data.range.startDate)} → {dateBR(data.range.endDate)}
            </span>
            {data.source === "mock" && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                Dados demonstrativos
              </span>
            )}
            {fetching && <span>Atualizando análise…</span>}
            {query.isError && (
              <span role="status">
                Últimos dados disponíveis. Não foi possível atualizar este recorte.
              </span>
            )}
          </div>
          {data.overview.grossSales === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="Nenhuma venda encontrada neste período."
              description="Altere o período ou os filtros para visualizar outros dados."
            />
          ) : (
            <div
              className={
                fetching
                  ? styles.sections +
                    " space-y-4 opacity-70 transition-opacity motion-reduce:transition-none"
                  : styles.sections + " space-y-4 transition-opacity motion-reduce:transition-none"
              }
              aria-busy={fetching}
            >
              <TrackingMotion revision={Date.parse(data.updatedAt)}>
                <SalesHero data={data} />
                <ChannelOriginSection data={data} />
                <CustomerMix data={data} />
                <RepurchaseAnalysis data={data} />
                <ValueAndReactivation data={data} />
              </TrackingMotion>
            </div>
          )}
        </>
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
