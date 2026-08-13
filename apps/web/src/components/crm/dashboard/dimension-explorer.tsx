"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { Label, Select } from "@/components/ui/form-controls";
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
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Métrica</Label>
          <Select value={metric} onChange={(event) => changeMetric(event.target.value)}>
            <option value="revenue">Receita</option>
            <option value="orders">Pedidos</option>
            <option value="leads">Leads</option>
            <option value="conversion">Conversão</option>
          </Select>
        </div>
        <div>
          <Label>Dimensão</Label>
          <Select value={dimension} onChange={(event) => setDimension(event.target.value)}>
            {dimensions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </div>
        <p className="pb-2 text-xs text-muted-foreground">
          Somente combinações com fonte confiável e ACL compatível.
        </p>
      </div>
      <AnalyticsChart
        title="Explorar dados"
        data={
          (result.data?.rows ?? []).filter((row) => row.value != null) as Array<{
            label: string;
            value: number;
          }>
        }
        valueFormatter={format}
      />
    </section>
  );
}
