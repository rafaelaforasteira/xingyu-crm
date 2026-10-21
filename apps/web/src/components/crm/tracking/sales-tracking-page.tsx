"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, UsersRound } from "lucide-react";
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
import { TrackingExecutiveSummary } from "./tracking-executive-summary";
import { TrackingActionInsights } from "./tracking-action-insights-panel";
import executive from "./tracking-executive.module.css";
import { ConceptHelp } from "./tracking-help";
import { dateBR } from "./tracking-format";
import styles from "./tracking-overview.module.css";
import theme from "./tracking-theme.module.css";

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
  const periodMeta = data ? (
    <div className={styles.periodMeta + " text-[11px] text-muted-foreground"} aria-live="polite">
      <span>
        {dateBR(data.range.startDate)} → {dateBR(data.range.endDate)}
      </span>
      {data.source === "mock" && (
        <span data-tracking-badge="demo" className="rounded-full px-2.5 py-1 font-medium">
          Dados demonstrativos — configure Shopify
        </span>
      )}
      {data.source === "api" && (
        <span data-tracking-badge="shopify" className="rounded-full px-2.5 py-1 font-medium">
          Dados Shopify
        </span>
      )}
      {fetching && <span>Atualizando análise…</span>}
      {query.isError && (
        <span role="status">Últimos dados disponíveis. Não foi possível atualizar este recorte.</span>
      )}
    </div>
  ) : null;
  const refresh = () =>
    runner.current({
      isFetching: query.isFetching,
      refetch: () => query.refetch({ cancelRefetch: false }),
      onPending: setRefreshing,
      onSuccess: () => toast.success("Dados atualizados"),
      onError: () => toast.error("Não foi possível atualizar os dados."),
    });
  return (
    <div data-module-theme="tracking" className={theme.root + " " + styles.page + " space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h1 className="sr-only">Inteligência de Vendas</h1>
          <p className="text-xs font-medium text-muted-foreground">
            Tracking <span className="mx-1 text-border">/</span> Visão Geral
          </p>
          <ConceptHelp
            label="Inteligência de Vendas"
            text={
              <>
                <strong className="mb-1 block text-[13px] font-semibold leading-snug text-foreground">
                  Inteligência de Vendas
                </strong>
                <span className="text-muted-foreground">
                  Entenda quanto foi vendido, de onde vieram as vendas, quem comprou e como esses
                  clientes se comportam ao longo do tempo.
                </span>
              </>
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            data-tracking-control="refresh"
            className="h-9 w-9 shrink-0 rounded-full shadow-sm"
            aria-label="Atualizar dados da análise"
            title="Atualizar dados"
            disabled={fetching}
            onClick={refresh}
          >
            <RefreshCw aria-hidden className={"h-4 w-4 " + (fetching ? styles.refresh : "")} />
          </Button>
          <SalesTrackingFilters appliedFilters={appliedFilters} onApply={setAppliedFilters} />
        </div>
      </div>

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
        data.overview.grossSales === 0 ? (
          <>
            {periodMeta}
            <EmptyState
              icon={UsersRound}
              title="Nenhuma venda encontrada neste período."
              description="Altere o período ou os filtros para visualizar outros dados."
            />
          </>
        ) : (
          <div
            className={
              fetching
                ? styles.sections + " opacity-70 transition-opacity motion-reduce:transition-none"
                : styles.sections + " transition-opacity motion-reduce:transition-none"
            }
            aria-busy={fetching}
          >
            <TrackingMotion revision={Date.parse(data.updatedAt)}>
              <div className={executive.stack}>
                <TrackingExecutiveSummary data={data} meta={periodMeta} />
              </div>
              <SalesHero data={data} />
              <ChannelOriginSection data={data} />
              <CustomerMix data={data} />
              <RepurchaseAnalysis data={data} />
              <ValueAndReactivation data={data} />
              <div className={executive.closing}>
                <TrackingActionInsights data={data} />
              </div>
            </TrackingMotion>
          </div>
        )
      ) : null}
    </div>
  );
}

function TrackingSkeleton() {
  return (
    <div className="space-y-4" aria-label="Carregando inteligência de vendas">
      <div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-72" />
        <div className={"mt-3 " + executive.kpiGrid}>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className={executive.kpiSkeleton} />
          ))}
        </div>
      </div>
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
      <div>
        <Skeleton className="h-4 w-44" />
        <Skeleton className="mt-2 h-3 w-64" />
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
