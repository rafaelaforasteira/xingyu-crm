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
}: {
  title: string;
  data: Array<Record<string, unknown>>;
  kind?: "bar" | "line" | "donut";
  dataKey?: string;
  secondaryKey?: string;
  valueFormatter?: (value: number) => string;
}) {
  const reduced = useReducedMotion();
  const animationDuration = reduced ? 0 : 650;
  const tooltip = { formatter: (value: number) => valueFormatter(Number(value)) };
  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {!data.length ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            —
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {kind === "line" ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip {...tooltip} />
                <Legend />
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
                <Legend />
              </PieChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
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
