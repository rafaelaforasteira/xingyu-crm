"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#7c3aed", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#a78bfa"];

export function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = React.useState(reduced ? value : 0);
  React.useEffect(() => {
    if (reduced) return setShown(value);
    const start = performance.now();
    const duration = 650;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced, value]);
  return <>{format(shown)}</>;
}

export function AnalyticsChart({
  title,
  data,
  kind = "bar",
  dataKey = "value",
  secondaryKey,
  valueFormatter = (value) => String(value),
  axisFormatter,
  emptyMessage = "Nenhum dado disponível para este período.",
}: {
  title: string;
  data: Array<Record<string, unknown>>;
  kind?: "bar" | "horizontal-bar" | "line" | "donut";
  dataKey?: string;
  secondaryKey?: string;
  valueFormatter?: (value: number) => string;
  axisFormatter?: (value: number) => string;
  emptyMessage?: string;
}) {
  const reduced = useReducedMotion();
  const animationDuration = reduced ? 0 : 650;
  const tooltip = { formatter: (value: number) => valueFormatter(Number(value)) };
  const hasValues = data.some(
    (row) => Number(row[dataKey] ?? 0) !== 0 || (secondaryKey && Number(row[secondaryKey] ?? 0) !== 0),
  );
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {!data.length || !hasValues ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/15 px-6 text-center">
            <p className="text-sm font-medium text-foreground/75">{emptyMessage}</p>
            <p className="mt-1 text-xs text-muted-foreground">Altere o período ou os filtros para consultar outros dados.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {kind === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={axisFormatter ? 72 : 48} tickFormatter={axisFormatter} />
                <Tooltip {...tooltip} />
                {secondaryKey ? (
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{ fontSize: 10, lineHeight: "14px" }}
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  name="Realizado"
                  stroke={COLORS[0]}
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={!reduced}
                  animationDuration={animationDuration}
                />
                {secondaryKey ? (
                  <Line
                    type="monotone"
                    dataKey={secondaryKey}
                    name="Esperado"
                    stroke={COLORS[1]}
                    strokeDasharray="5 4"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={!reduced}
                    animationDuration={animationDuration}
                  />
                ) : null}
              </LineChart>
            ) : kind === "donut" ? (
              <PieChart>
                <Pie
                  data={data}
                  dataKey={dataKey}
                  nameKey="label"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={2}
                  isAnimationActive={!reduced}
                  animationDuration={animationDuration}
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltip} />
                <Legend
                  iconType="circle"
                  iconSize={7}
                  wrapperStyle={{ fontSize: 10, lineHeight: "14px" }}
                />
              </PieChart>
            ) : kind === "horizontal-bar" ? (
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={axisFormatter} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={112} />
                <Tooltip {...tooltip} />
                <Bar
                  dataKey={dataKey}
                  fill={COLORS[0]}
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={!reduced}
                  animationDuration={animationDuration}
                />
              </BarChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={axisFormatter ? 72 : 48} tickFormatter={axisFormatter} />
                <Tooltip {...tooltip} />
                <Bar
                  dataKey={dataKey}
                  fill={COLORS[0]}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={!reduced}
                  animationDuration={animationDuration}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueComparisonTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: Record<string, unknown> }> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const current = Number(row.value ?? 0);
  const previous = row.previousValue == null ? null : Number(row.previousValue);
  const difference = previous == null ? null : current - previous;
  const variation = previous != null && previous > 0 ? (difference! / previous) * 100 : null;
  const formatMoney = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  const formatDate = (value: unknown) => typeof value === "string" ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(`${value}T12:00:00`)) : "—";
  return (
    <div className="min-w-64 rounded-xl border border-border bg-card p-3 shadow-xl">
      <p className="mb-2 text-sm font-semibold capitalize">{formatDate(row.date)}</p>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-5"><span className="text-muted-foreground">Período atual</span><strong>{formatMoney(current)}</strong></div>
        {previous == null ? (
          <p className="rounded-md bg-muted/60 px-2 py-1.5 text-muted-foreground">Dia inexistente no mês anterior</p>
        ) : (
          <>
            <div className="flex justify-between gap-5"><span className="text-muted-foreground">{formatDate(row.previousLabel)}</span><strong>{formatMoney(previous)}</strong></div>
            <div className="flex justify-between gap-5"><span className="text-muted-foreground">Diferença</span><strong className={difference! >= 0 ? "text-emerald-600" : "text-red-600"}>{difference! >= 0 ? "+" : ""}{formatMoney(difference!)}</strong></div>
            <div className="flex justify-between gap-5"><span className="text-muted-foreground">Variação</span><strong className={variation != null && variation >= 0 ? "text-emerald-600" : "text-red-600"}>{variation == null ? "Sem base" : `${variation >= 0 ? "+" : ""}${variation.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}</strong></div>
            <div className="flex justify-between gap-5 border-t border-border/60 pt-1.5"><span className="text-muted-foreground">Pedidos</span><strong>{Number(row.orders ?? 0)} vs. {Number(row.previousOrders ?? 0)}</strong></div>
          </>
        )}
      </div>
    </div>
  );
}

export function RevenueComparisonChart({ data }: { data: Array<Record<string, unknown>> }) {
  const reduced = useReducedMotion();
  const hasValues = data.some((row) => Number(row.value ?? 0) > 0 || Number(row.previousValue ?? 0) > 0);
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader><CardTitle className="text-base">Receita confirmada por dia</CardTitle></CardHeader>
      <CardContent className="h-80">
        {!data.length || !hasValues ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/15 px-6 text-center text-sm text-muted-foreground">Nenhuma receita confirmada neste período.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis width={72} tick={{ fontSize: 11 }} tickFormatter={(value) => value >= 1000 ? `R$ ${Number(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : `R$ ${value}`} />
              <Tooltip content={<RevenueComparisonTooltip />} cursor={{ fill: "rgba(124,58,237,0.05)" }} />
              <Legend />
              <Bar dataKey="value" name="Período atual" fill="#7c3aed" radius={[5,5,0,0]} isAnimationActive={!reduced} />
              <Bar dataKey="previousValue" name="Mesmo dia do mês anterior" fill="#c4b5fd" radius={[5,5,0,0]} isAnimationActive={!reduced} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
