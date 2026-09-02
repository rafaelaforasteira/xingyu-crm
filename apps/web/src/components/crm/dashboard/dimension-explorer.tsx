"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartNoAxesCombined, Rows3 } from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { FilterSelect } from "@/components/ui/filter-select";
import { AnalyticsChart } from "./analytics-charts";

const matrix: Record<string, Array<{ value: string; label: string }>> = {
  revenue: [
    { value: "seller", label: "Pessoa" },
    { value: "channel", label: "Canal" },
    { value: "pipeline", label: "Pipeline/etapa" },
    { value: "tag", label: "Tag" },
    { value: "customer_type", label: "Tipo de cliente" },
  ],
  orders: [
    { value: "channel", label: "Canal" },
    { value: "tag", label: "Tag" },
    { value: "customer_type", label: "Tipo de cliente" },
  ],
  leads: [
    { value: "channel", label: "Canal" },
    { value: "pipeline", label: "Pipeline/etapa" },
  ],
  conversion: [
    { value: "seller", label: "Pessoa" },
    { value: "channel", label: "Canal" },
  ],
};

export function DimensionExplorer({ query }: { query: Record<string, string | undefined> }) {
  const [metric, setMetric] = React.useState("revenue");
  const [dimension, setDimension] = React.useState("seller");
  const dimensions = matrix[metric] ?? matrix.revenue!;
  const result = useQuery({
    queryKey: ["dashboard", "explore", metric, dimension, query],
    queryFn: () => dashboardApi.explore({ ...query, metric, dimension }),
  });
  const changeMetric = (next: string) => {
    const nextDimensions = matrix[next] ?? matrix.revenue!;
    setMetric(next);
    if (!nextDimensions.some((item) => item.value === dimension)) {
      setDimension(nextDimensions[0]?.value ?? "seller");
    }
  };
  const format =
    metric === "revenue"
      ? (value: number) =>
          new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
      : metric === "conversion"
        ? (value: number) => `${value}%`
        : (value: number) => new Intl.NumberFormat("pt-BR").format(value);
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4" data-testid="dimension-explorer">
      <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
        <FilterSelect
          label="Métrica"
          icon={ChartNoAxesCombined}
          value={metric}
          onChange={changeMetric}
          options={[
            { value: "revenue", label: "Receita" },
            { value: "orders", label: "Pedidos" },
            { value: "leads", label: "Leads" },
            { value: "conversion", label: "Conversão" },
          ]}
        />
        <FilterSelect
          label="Dimensão"
          icon={Rows3}
          value={dimension}
          onChange={setDimension}
          options={dimensions}
        />
      </div>
      <AnalyticsChart
        title="Explorar dados"
        data={
          (result.data?.rows ?? []).filter((row) => row.value != null && Number(row.value) > 0) as Array<{
            label: string;
            value: number;
          }>
        }
        kind="horizontal-bar"
        valueFormatter={format}
        emptyMessage="Nenhum resultado para esta combinação."
      />
    </section>
  );
}
