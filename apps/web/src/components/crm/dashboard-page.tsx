"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/utils";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { PageHeader, MetricCard, ErrorBanner } from "@/components/crm/page-header";
import { SimpleBarChart, SimpleLineChart, SimplePieChart } from "@/components/crm/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";

export function DashboardPage() {
  const router = useRouter();
  const metrics = useQuery({
    queryKey: queryKeys.dashboard.metrics,
    queryFn: () => dashboardApi.metrics(),
    retry: false,
  });
  const charts = useQuery({
    queryKey: queryKeys.dashboard.charts,
    queryFn: () => dashboardApi.charts(),
    retry: false,
  });
  const lists = useQuery({
    queryKey: queryKeys.dashboard.lists,
    queryFn: () => dashboardApi.lists(),
    retry: false,
  });

  const m = metrics.data;
  const error =
    metrics.error || charts.error || lists.error
      ? "Não foi possível carregar parte dos dados. Verifique se a API está em http://localhost:3333."
      : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão operacional do comercial, atendimento e pós-venda."
      />
      {error ? <ErrorBanner message={error} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Negócios abertos"
          value={m?.openDeals ?? "—"}
          loading={metrics.isLoading}
          onClick={() => router.push("/pipelines")}
        />
        <MetricCard
          label="Valor no pipeline"
          value={m ? formatCurrency(m.pipelineValue) : "—"}
          loading={metrics.isLoading}
          onClick={() => router.push("/pipelines")}
        />
        <MetricCard
          label="Tarefas de hoje"
          value={m?.tasksToday ?? "—"}
          loading={metrics.isLoading}
          onClick={() => router.push("/tasks?view=today")}
        />
        <MetricCard
          label="Conversas não lidas"
          value={m?.unreadConversations ?? "—"}
          loading={metrics.isLoading}
          onClick={() => router.push("/inbox")}
        />
        <MetricCard
          label="Pedidos em trânsito"
          value={m?.ordersInTransit ?? "—"}
          loading={metrics.isLoading}
          onClick={() => router.push("/orders")}
        />
        <MetricCard
          label="Prontos para recompra"
          value={m?.repurchaseReady ?? "—"}
          loading={metrics.isLoading}
          onClick={() => router.push("/repurchase")}
        />
        <MetricCard
          label="Pós-venda aberto"
          value={m?.afterSalesOpen ?? "—"}
          loading={metrics.isLoading}
          onClick={() => router.push("/after-sales")}
        />
        <MetricCard
          label="Taxa de conversão"
          value={m?.conversionRate != null ? `${m.conversionRate}%` : "—"}
          loading={metrics.isLoading}
          onClick={() => router.push("/reports")}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <SimpleBarChart
          title="Pipeline por estágio"
          data={charts.data?.pipelineByStage ?? []}
        />
        <SimpleLineChart
          title="Receita (tendência)"
          data={charts.data?.revenueTrend ?? []}
        />
        <SimplePieChart
          title="Mix de canais"
          data={charts.data?.channelMix ?? []}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <ListCard
          title="Tarefas de hoje"
          empty="Nenhuma tarefa para hoje"
          items={(lists.data?.tasksToday ?? []).map((t) => ({
            id: t.id,
            href: "/tasks",
            title: t.title,
            meta: t.contact?.name ?? t.status,
          }))}
        />
        <ListCard
          title="Inbox não lida"
          empty="Inbox em dia"
          items={(lists.data?.unread ?? []).map((c) => ({
            id: c.id,
            href: `/inbox/${c.id}`,
            title: c.contact?.name ?? "Conversa",
            meta:
              c.lastMessagePreview ?? (
                <ClientRelativeTime value={c.lastMessageAt} />
              ),
          }))}
        />
        <ListCard
          title="Negócios recentes"
          empty="Sem negócios"
          items={(lists.data?.recentDeals ?? []).map((d) => ({
            id: d.id,
            href: `/pipelines/${d.pipelineId}/deals/${d.id}`,
            title: d.name,
            meta: formatCurrency(d.value ?? 0),
          }))}
        />
        <ListCard
          title="Pós-venda"
          empty="Sem ocorrências"
          items={(lists.data?.afterSales ?? []).map((o) => ({
            id: o.id,
            href: `/after-sales/${o.id}`,
            title: o.title,
            meta: o.status,
          }))}
        />
      </div>
    </div>
  );
}

function ListCard({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; href: string; title: string; meta?: ReactNode }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 ? (
          <EmptyState icon={Inbox} title={empty} className="border-0 bg-transparent py-6" />
        ) : (
          items.slice(0, 6).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-accent"
            >
              <span className="truncate text-sm font-medium">{item.title}</span>
              {item.meta ? (
                <Badge variant="secondary" className="shrink-0 max-w-[40%] truncate">
                  {item.meta}
                </Badge>
              ) : null}
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
