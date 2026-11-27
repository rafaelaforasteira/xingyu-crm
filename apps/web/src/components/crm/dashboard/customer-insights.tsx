"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  RefreshCw,
  ShoppingBag,
  Tags,
  TrendingUp,
  UserPlus,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "./analytics-charts";

export type CustomerSegment = {
  id: string;
  name: string;
  color?: string | null;
  customers?: number | null;
  orders: number;
  revenue: number;
};

export type CustomerAnalyticsData = {
  newCustomers: number;
  recurringCustomers: number;
  newRevenue: number;
  recurringRevenue: number;
  newTicket: number | null;
  recurringTicket: number | null;
  previousNewCustomers?: number | null;
  tags: CustomerSegment[];
};

export const CUSTOMERS_DEMO_DATA: CustomerAnalyticsData = {
  newCustomers: 128,
  recurringCustomers: 84,
  newRevenue: 48_760,
  recurringRevenue: 36_480,
  newTicket: 380.94,
  recurringTicket: 434.29,
  previousNewCustomers: 108,
  tags: [
    { id: "vip", name: "VIP", customers: 38, orders: 74, revenue: 29_840 },
    { id: "wholesale", name: "Atacado", customers: 24, orders: 41, revenue: 18_630 },
    { id: "store", name: "Loja física", customers: 46, orders: 58, revenue: 14_920 },
    { id: "instagram", name: "Instagram", customers: 52, orders: 55, revenue: 12_460 },
    { id: "referral", name: "Indicação", customers: 31, orders: 36, revenue: 9_390 },
  ],
};

const integerFormatter = new Intl.NumberFormat("pt-BR");
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const safeShare = (value: number, total: number) =>
  total > 0 && Number.isFinite(value) && Number.isFinite(total) ? (value / total) * 100 : 0;

export const clampPercentage = (value: number) =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

export type TicketComparison = {
  difference: number;
  lift: number;
  direction: "higher" | "lower" | "equal";
};

export function calculateTicketComparison(
  newTicket: number | null,
  recurringTicket: number | null,
): TicketComparison | null {
  if (
    newTicket == null ||
    recurringTicket == null ||
    !Number.isFinite(newTicket) ||
    !Number.isFinite(recurringTicket) ||
    newTicket <= 0 ||
    recurringTicket < 0
  ) {
    return null;
  }
  const difference = recurringTicket - newTicket;
  return {
    difference,
    lift: (difference / newTicket) * 100,
    direction: difference > 0 ? "higher" : difference < 0 ? "lower" : "equal",
  };
}

const formatPercent = (value: number) => `${percentFormatter.format(value)}%`;
const formatMoney = (value: number | null) =>
  value == null || !Number.isFinite(value) ? "—" : moneyFormatter.format(value);

export function getTicketInsight(newTicket: number | null, recurringTicket: number | null) {
  const comparison = calculateTicketComparison(newTicket, recurringTicket);
  if (!comparison) return "Não há dados suficientes para comparar o ticket médio.";
  if (comparison.direction === "equal") {
    return "O ticket médio de clientes novos e recorrentes é equivalente neste período.";
  }
  return `O ticket médio dos recorrentes é ${formatPercent(Math.abs(comparison.lift))} ${
    comparison.direction === "higher" ? "maior" : "menor"
  }, uma diferença de ${formatMoney(Math.abs(comparison.difference))} por compra.`;
}

function Delta({ children, positive = true }: { children: React.ReactNode; positive?: boolean }) {
  return (
    <span className={positive ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
      {children}
    </span>
  );
}

function CustomerKpi({
  label,
  value,
  note,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  note: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "neutral";
}) {
  return (
    <Card className="min-w-0 rounded-xl border-primary/10 bg-[hsl(262_45%_97%)] shadow-soft">
      <CardContent className="flex min-h-[130px] flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              tone === "success"
                ? "bg-emerald-100 text-emerald-700"
                : tone === "neutral"
                  ? "bg-muted text-foreground/70"
                  : "bg-primary/10 text-primary",
            )}
            aria-hidden="true"
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        </div>
        <p className="mt-2 break-words text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
        <p className="mt-auto pt-2 text-xs leading-snug text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}

function CompositionTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  total: number;
}) {
  const item = payload?.[0];
  if (!active || !item) return null;
  const value = Number(item.value ?? 0);
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold">{item.name}</p>
      <p className="mt-1 text-muted-foreground">
        {integerFormatter.format(value)} clientes · {formatPercent(safeShare(value, total))}
      </p>
    </div>
  );
}

function CustomerComposition({ data }: { data: CustomerAnalyticsData }) {
  const reduced = useReducedMotion();
  const total = data.newCustomers + data.recurringCustomers;
  const rows = [
    { name: "Novos", value: data.newCustomers, color: "#7c3aed" },
    { name: "Recorrentes", value: data.recurringCustomers, color: "#059669" },
  ];

  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Composição dos compradores</CardTitle>
        <p className="text-xs text-muted-foreground">
          Participação de clientes novos e recorrentes no período.
        </p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="Ainda não há compras neste período"
            description="Os indicadores serão preenchidos quando houver pedidos pagos ou confirmados."
            className="border-0 bg-muted/15 py-10"
          />
        ) : (
          <div className="mx-auto grid w-full max-w-[620px] items-center gap-2 sm:grid-cols-[minmax(260px,1fr)_190px]">
            <div
              className="relative h-56 min-w-0"
              aria-label={`Total de ${integerFormatter.format(total)} compradores`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rows}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    stroke="transparent"
                    isAnimationActive={!reduced}
                    animationDuration={650}
                  >
                    {rows.map((row) => (
                      <Cell key={row.name} fill={row.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CompositionTooltip total={total} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <strong className="text-2xl tabular-nums tracking-tight">
                  {integerFormatter.format(total)}
                </strong>
                <span className="text-xs text-muted-foreground">compradores</span>
              </div>
            </div>
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.name} className="rounded-xl border border-border/70 p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: row.color }}
                      aria-hidden="true"
                    />
                    {row.name}
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <strong className="text-lg tabular-nums">
                      {integerFormatter.format(row.value)}
                    </strong>
                    <span className="text-xs font-semibold">
                      {formatPercent(safeShare(row.value, total))}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Recorrência no período:{" "}
                <strong className="text-foreground">
                  {formatPercent(safeShare(data.recurringCustomers, total))}
                </strong>
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueComposition({ data }: { data: CustomerAnalyticsData }) {
  const totalRevenue = data.newRevenue + data.recurringRevenue;
  const totalCustomers = data.newCustomers + data.recurringCustomers;
  const rows = [
    { label: "Clientes novos", value: data.newRevenue, color: "bg-primary" },
    { label: "Clientes recorrentes", value: data.recurringRevenue, color: "bg-emerald-600" },
  ];
  const ticketInsight = getTicketInsight(data.newTicket, data.recurringTicket);

  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl shadow-soft">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Composição da receita</CardTitle>
        <p className="text-xs text-muted-foreground">
          Quanto cada perfil de cliente contribuiu para a receita.
        </p>
      </CardHeader>
      <CardContent>
        {totalCustomers === 0 && totalRevenue === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Ainda não há compras neste período"
            description="Os indicadores serão preenchidos quando houver pedidos pagos ou confirmados."
            className="border-0 bg-muted/15 py-10"
          />
        ) : (
          <div className="flex min-h-56 flex-col">
            <div className="rounded-xl bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Receita total de clientes</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {formatMoney(totalRevenue)}
              </p>
            </div>
            <div className="mt-5 space-y-5">
              {rows.map((row) => {
                const share = safeShare(row.value, totalRevenue);
                return (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercent(share)} da receita
                        </p>
                      </div>
                      <strong className="text-sm tabular-nums">{formatMoney(row.value)}</strong>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", row.color)}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <div className="flex items-start gap-2">
                <TrendingUp
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <p>
                  Clientes recorrentes representam{" "}
                  <strong className="text-emerald-800">
                    {formatPercent(safeShare(data.recurringCustomers, totalCustomers))}
                  </strong>{" "}
                  dos compradores e geram{" "}
                  <strong className="text-emerald-800">
                    {formatPercent(safeShare(data.recurringRevenue, totalRevenue))}
                  </strong>{" "}
                  da receita.
                </p>
              </div>
              <div className="mt-2 flex items-start gap-2 border-t border-emerald-100/70 pt-2">
                <BadgeDollarSign
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                  aria-hidden="true"
                />
                <p>{ticketInsight}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerSegments({ segments }: { segments: CustomerSegment[] }) {
  const rows = [...segments].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Principais segmentos</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Tags associadas aos compradores e sua contribuição para o resultado.
          </p>
        </div>
        <Link
          href="/clients"
          className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver clientes <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        {!rows.length ? (
          <EmptyState
            icon={Tags}
            title="Nenhuma tag associada aos compradores"
            description="Adicione tags aos clientes para acompanhar o desempenho de cada segmento."
            className="border-0 bg-muted/15 py-10"
          />
        ) : (
          <div>
            <div className="hidden grid-cols-[minmax(130px,1.1fr)_90px_90px_minmax(180px,1fr)_130px] gap-4 border-b border-border/70 px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:grid">
              <span>Segmento</span>
              <span>Clientes</span>
              <span>Pedidos</span>
              <span>Participação</span>
              <span className="text-right">Receita</span>
            </div>
            <div className="divide-y divide-border/70">
              {rows.map((row) => {
                const share = safeShare(row.revenue, totalRevenue);
                const barWidth = clampPercentage(share);
                return (
                  <div
                    key={row.id}
                    className="grid gap-2 px-1 py-3 lg:grid-cols-[minmax(130px,1.1fr)_90px_90px_minmax(180px,1fr)_130px] lg:items-center lg:gap-4 lg:px-3"
                  >
                    <div className="flex items-center justify-between gap-3 lg:block">
                      <Badge variant="secondary" className="max-w-full truncate">
                        {row.name}
                      </Badge>
                      <strong className="tabular-nums lg:hidden">{formatMoney(row.revenue)}</strong>
                    </div>
                    <p className="text-xs text-muted-foreground lg:text-sm lg:text-foreground">
                      {row.customers == null
                        ? "— clientes"
                        : `${integerFormatter.format(row.customers)} clientes`}
                    </p>
                    <p className="text-xs text-muted-foreground lg:text-sm lg:text-foreground">
                      {integerFormatter.format(row.orders)} pedidos
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>{formatPercent(share)} da receita</span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-muted"
                        role="img"
                        aria-label={`${row.name}: ${formatPercent(share)} da receita, ${formatMoney(row.revenue)}`}
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                    <strong className="hidden text-right text-sm tabular-nums lg:block">
                      {formatMoney(row.revenue)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CustomerInsights({
  data,
  demo = false,
}: {
  data: CustomerAnalyticsData;
  demo?: boolean;
}) {
  const totalCustomers = data.newCustomers + data.recurringCustomers;
  const totalRevenue = data.newRevenue + data.recurringRevenue;
  const recurringShare = safeShare(data.recurringCustomers, totalCustomers);
  const newRevenueShare = safeShare(data.newRevenue, totalRevenue);
  const recurringRevenueShare = safeShare(data.recurringRevenue, totalRevenue);
  const ticketComparison = calculateTicketComparison(data.newTicket, data.recurringTicket);
  const growth =
    data.previousNewCustomers && data.previousNewCustomers > 0
      ? safeShare(data.newCustomers - data.previousNewCustomers, data.previousNewCustomers)
      : null;

  return (
    <div className="space-y-3">
      <Card className="rounded-xl border-border/70 bg-card shadow-soft">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">Comportamento da base de clientes</h2>
              {demo ? <Badge variant="secondary">Dados de demonstração</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Compare aquisição, recorrência e valor gerado pelos clientes no período selecionado.
            </p>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
              <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>
                <strong>Novo:</strong> primeira compra realizada no período
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-emerald-950">
              <RefreshCw className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>
                <strong>Recorrente:</strong> cliente com duas ou mais compras
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <CustomerKpi
          label="Clientes novos"
          value={integerFormatter.format(data.newCustomers)}
          icon={UserPlus}
          note={
            growth == null ? (
              "Primeira compra no período"
            ) : (
              <>
                <Delta positive={growth >= 0}>
                  {growth >= 0 ? "+" : ""}
                  {formatPercent(growth)}
                </Delta>{" "}
                em relação ao período anterior
              </>
            )
          }
        />
        <CustomerKpi
          label="Clientes recorrentes"
          value={integerFormatter.format(data.recurringCustomers)}
          icon={RefreshCw}
          tone="success"
          note={
            <>
              <strong className="text-foreground">{formatPercent(recurringShare)}</strong> dos
              compradores do período
            </>
          }
        />
        <CustomerKpi
          label="Receita de novos"
          value={formatMoney(data.newRevenue)}
          icon={WalletCards}
          note={
            <>
              <strong className="text-foreground">{formatPercent(newRevenueShare)}</strong> da
              receita de clientes
            </>
          }
        />
        <CustomerKpi
          label="Receita recorrente"
          value={formatMoney(data.recurringRevenue)}
          icon={TrendingUp}
          tone="success"
          note={
            <>
              <strong className="text-foreground">{formatPercent(recurringRevenueShare)}</strong> da
              receita de clientes
            </>
          }
        />
        <CustomerKpi
          label="Ticket de novos"
          value={formatMoney(data.newTicket)}
          icon={ShoppingBag}
          tone="neutral"
          note={
            ticketComparison == null
              ? "Comparação indisponível"
              : ticketComparison.direction === "equal"
                ? "Mesmo ticket dos recorrentes"
                : `${formatMoney(Math.abs(ticketComparison.difference))} ${ticketComparison.direction === "higher" ? "abaixo" : "acima"} dos recorrentes`
          }
        />
        <CustomerKpi
          label="Ticket de recorrentes"
          value={formatMoney(data.recurringTicket)}
          icon={BadgeDollarSign}
          tone="success"
          note={
            ticketComparison == null ? (
              "Comparação indisponível"
            ) : ticketComparison.direction === "equal" ? (
              "Mesmo ticket dos clientes novos"
            ) : (
              <>
                <Delta positive={ticketComparison.direction === "higher"}>
                  {formatPercent(Math.abs(ticketComparison.lift))}
                </Delta>{" "}
                {ticketComparison.direction === "higher" ? "maior" : "menor"} que o ticket de novos
              </>
            )
          }
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <CustomerComposition data={data} />
        <RevenueComposition data={data} />
      </div>
      <CustomerSegments segments={data.tags} />
    </div>
  );
}

export function CustomerInsightsSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[130px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <Skeleton className="h-[340px] rounded-2xl" />
        <Skeleton className="h-[340px] rounded-2xl" />
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
