"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { reportsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { PageHeader, ErrorBanner, MetricCard } from "@/components/crm/page-header";
import { SimpleBarChart, SimpleLineChart } from "@/components/crm/charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => reportsApi.overview(),
    retry: false,
  });

  const kpis = data?.kpis ?? [];
  const hasCharts =
    (data?.charts?.sales?.length ?? 0) > 0 ||
    (data?.charts?.funnel?.length ?? 0) > 0 ||
    (data?.charts?.owners?.length ?? 0) > 0;

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Indicadores comerciais e de performance."
      />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : kpis.length === 0 && !hasCharts ? (
        <EmptyState
          icon={BarChart3}
          title="Sem dados de relatório"
          description="Aguarde a API ou gere atividade no CRM."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <MetricCard
                key={kpi.label}
                label={kpi.label}
                value={kpi.value}
                hint={
                  kpi.change != null
                    ? `${kpi.change > 0 ? "+" : ""}${kpi.change}% vs período anterior`
                    : undefined
                }
              />
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <SimpleLineChart title="Vendas" data={data?.charts?.sales ?? []} />
            <SimpleBarChart title="Funil" data={data?.charts?.funnel ?? []} />
            <SimpleBarChart title="Por responsável" data={data?.charts?.owners ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
