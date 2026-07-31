"use client";

import { useQuery } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { marketingApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/utils";
import { PageHeader, ErrorBanner, MetricCard } from "@/components/crm/page-header";
import { SimpleBarChart, SimpleLineChart } from "@/components/crm/charts";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export function MarketingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.marketing,
    queryFn: () => marketingApi.overview(),
    retry: false,
  });

  const campaigns = data?.campaigns ?? [];
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend ?? 0), 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.leads ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Campanhas, alcance e conversões."
      />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Campanhas"
          value={isLoading ? "—" : campaigns.length}
          loading={isLoading}
        />
        <MetricCard
          label="Investimento"
          value={isLoading ? "—" : formatCurrency(totalSpend)}
          loading={isLoading}
        />
        <MetricCard
          label="Leads gerados"
          value={isLoading ? "—" : totalLeads}
          loading={isLoading}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <SimpleLineChart
          title="Alcance"
          data={data?.charts?.reach ?? []}
        />
        <SimpleBarChart
          title="Conversões"
          data={data?.charts?.conversions ?? []}
        />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Campanhas</h2>
        </div>
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Sem campanhas"
            description="A API não retornou campanhas de marketing."
            className="m-4"
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Campanha</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Investimento</th>
                <th className="px-4 py-3 text-left font-medium">Leads</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{c.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{formatCurrency(c.spend)}</td>
                  <td className="px-4 py-3">{c.leads}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
