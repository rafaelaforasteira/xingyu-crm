"use client";

import dynamic from "next/dynamic";
import type { ChartPoint, ChannelPerformancePoint } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BarChart3, PieChart } from "lucide-react";

const SimpleLineChart = dynamic(
  () => import("@/components/crm/charts").then((mod) => ({ default: mod.SimpleLineChart })),
  { loading: () => <Skeleton className="h-56 w-full" />, ssr: false },
);

export function RevenueChart({
  data,
  loading,
}: {
  data: ChartPoint[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle>Receita e meta</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data.length) {
    return (
      <Card className="rounded-2xl shadow-soft">
        <CardHeader>
          <CardTitle>Receita e meta</CardTitle>
          <p className="text-xs text-muted-foreground">Evolução da receita confirmada</p>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="Ainda não existem vendas confirmadas no período"
            description="Quando houver pedidos pagos ou confirmados, a evolução da receita aparece aqui."
            className="border-0 bg-transparent py-10"
          />
        </CardContent>
      </Card>
    );
  }

  return <SimpleLineChart title="Receita e meta" data={data} />;
}

export function ChannelPerformance({
  data,
  loading,
}: {
  data: ChannelPerformancePoint[];
  loading?: boolean;
}) {
  const total = data.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Resultado por canal</CardTitle>
        <p className="text-xs text-muted-foreground">
          Receita, leads e conversão — não apenas volume de mensagens
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : data.length === 0 ? (
          <EmptyState
            icon={PieChart}
            title="Nenhum negócio possui um canal de origem identificado neste período"
            description="Registre a origem dos negócios ou conecte canais para visualizar receita e conversão por canal."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Receita no período: <strong className="text-foreground">{formatCurrency(total)}</strong>
            </p>
            {data.slice(0, 6).map((channel) => (
              <div key={channel.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{channel.label}</span>
                  <span className="font-semibold">{formatCurrency(channel.revenue)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(4, channel.sharePct)}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {channel.leads} leads · {channel.sales} vendas ·{" "}
                  {channel.conversionRate != null
                    ? `${channel.conversionRate}% conversão`
                    : "conversão indisponível"}
                  {" · "}
                  {channel.sharePct}% da receita
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
