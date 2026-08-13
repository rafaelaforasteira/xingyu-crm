"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  MessagesSquare,
  ShoppingBag,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsChart } from "./analytics-charts";
import { GoalsPanel } from "./goals-panel";
import { DimensionExplorer } from "./dimension-explorer";

type Tab = "overview" | "commercial" | "attendance" | "team" | "goals" | "customers" | "channels";
const TABS: Array<{ value: Tab; label: string }> = [
  { value: "overview", label: "Visão geral" },
  { value: "commercial", label: "Comercial" },
  { value: "attendance", label: "Atendimento" },
  { value: "team", label: "Equipe" },
  { value: "goals", label: "Metas" },
  { value: "customers", label: "Clientes" },
  { value: "channels", label: "Canais" },
];
const money = (value: unknown) =>
  typeof value === "number"
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)
    : "—";
const number = (value: unknown) =>
  typeof value === "number" ? new Intl.NumberFormat("pt-BR").format(value) : "—";
const minutes = (value: unknown) =>
  typeof value === "number"
    ? value < 60
      ? `${Math.round(value)} min`
      : `${(value / 60).toFixed(1)} h`
    : "—";

function goalPeriod(period: string, from: string, to: string) {
  if (period === "custom" && from && to) {
    const end = new Date(`${to}T00:00:00.000Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    return { from: `${from}T00:00:00.000Z`, to: end.toISOString() };
  }
  const end = new Date();
  const start = new Date(end);
  if (period === "today") start.setUTCHours(0, 0, 0, 0);
  else if (period === "7d") start.setUTCDate(start.getUTCDate() - 7);
  else if (period === "month") {
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
  } else if (period === "previous-month") {
    end.setUTCDate(1);
    end.setUTCHours(0, 0, 0, 0);
    start.setTime(end.getTime());
    start.setUTCMonth(start.getUTCMonth() - 1);
  } else start.setUTCDate(start.getUTCDate() - 30);
  return { from: start.toISOString(), to: end.toISOString() };
}

function Metric({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="min-w-0">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
        </div>
        <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
        {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
}

function Availability({ value }: { value?: string }) {
  if (!value || value === "READY") return null;
  const labels: Record<string, string> = {
    TRACKING_FROM_NOW: "Rastreando a partir de agora",
    BLOCKED_PROVIDER: "Aguardando integração do provedor",
    NOT_SUPPORTED: "Histórico indisponível",
  };
  return (
    <Badge variant="outline" title={labels[value] ?? value}>
      {labels[value] ?? value}
    </Badge>
  );
}

function Ranking({
  rows,
  metric = "revenue",
}: {
  rows: Array<Record<string, unknown>>;
  metric?: string;
}) {
  if (!rows.length) return <EmptyState icon={UsersRound} title="Sem dados para o ranking" />;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Posição</th>
            <th className="px-4 py-3 text-left">Pessoa</th>
            <th className="px-4 py-3 text-right">Receita</th>
            <th className="px-4 py-3 text-right">Conversão</th>
            <th className="px-4 py-3 text-right">Negócios abertos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id ?? index)} className="border-b last:border-0">
              <td className="px-4 py-3 font-semibold">{`${index + 1}º`}</td>
              <td className="px-4 py-3 font-medium">{String(row.name ?? "—")}</td>
              <td className="px-4 py-3 text-right">
                {metric === "revenue" ? money(row.revenue) : number(row[metric])}
              </td>
              <td className="px-4 py-3 text-right">
                {typeof row.conversionRate === "number" ? `${row.conversionRate}%` : "—"}
              </td>
              <td className="px-4 py-3 text-right">{number(row.openDeals)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requestedTab = params.get("tab") as Tab | null;
  const tab = TABS.some((item) => item.value === requestedTab) ? requestedTab! : "overview";
  const period = params.get("period") || "30d";
  const pipelineId = params.get("pipeline") || "";
  const teamId = params.get("team") || "";
  const ownerId = params.get("responsible") || "";
  const channel = params.get("channel") || "";
  const from = params.get("start") || "";
  const to = params.get("end") || "";
  const replace = React.useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      Object.entries(changes).forEach(([key, value]) =>
        value ? next.set(key, value) : next.delete(key),
      );
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );
  const options = useQuery({
    queryKey: ["dashboard", "filter-options"],
    queryFn: dashboardApi.filters,
    staleTime: 60_000,
  });
  const query = {
    period,
    pipelineId: pipelineId || undefined,
    teamId: teamId || undefined,
    ownerId: ownerId || undefined,
    channel: channel || undefined,
    from: from || undefined,
    to: to || undefined,
  };
  const area = useQuery({
    queryKey: ["dashboard", "intelligence", tab, query],
    queryFn: () => dashboardApi.area(tab as Exclude<Tab, "goals">, query),
    enabled: tab !== "goals",
    retry: false,
    placeholderData: (previous) => previous,
  });
  const goals = useQuery({
    queryKey: ["dashboard", "goals", query],
    queryFn: () =>
      dashboardApi.goals({
        ...goalPeriod(period, from, to),
        pipelineId: query.pipelineId,
        teamId: query.teamId,
        userId: query.ownerId,
      }),
    enabled: tab === "goals",
    retry: false,
  });
  const data = area.data ?? {};
  const metrics = (data.metrics ?? {}) as Record<string, unknown>;

  return (
    <div
      className="mx-auto w-full max-w-[1500px] space-y-5"
      data-testid="dashboard-intelligence-center"
    >
      <PageHeader title="Dashboard" description="Visão geral da operação." />
      <Tabs
        value={tab}
        onValueChange={(value) => replace({ tab: value === "overview" ? null : value })}
      >
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          {TABS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <section className="rounded-xl border border-border bg-card p-3 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Período</Label>
            <Select
              value={period}
              onChange={(event) =>
                replace({
                  period: event.target.value === "30d" ? null : event.target.value,
                  start: null,
                  end: null,
                })
              }
            >
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="month">Este mês</option>
              <option value="previous-month">Mês anterior</option>
              <option value="custom">Personalizado</option>
            </Select>
          </div>
          <div>
            <Label>Pipeline</Label>
            <Select
              value={pipelineId}
              onChange={(event) => replace({ pipeline: event.target.value || null })}
            >
              <option value="">Todos acessíveis</option>
              {(options.data?.pipelines ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Equipe</Label>
            <Select
              value={teamId}
              onChange={(event) => replace({ team: event.target.value || null, responsible: null })}
            >
              <option value="">Todas permitidas</option>
              {(options.data?.teams ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Responsável</Label>
            <Select
              value={ownerId}
              onChange={(event) => replace({ responsible: event.target.value || null })}
            >
              <option value="">Todos permitidos</option>
              {(options.data?.users ?? [])
                .filter((item) => !teamId || item.teamId === teamId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
          </div>
          <div>
            <Label>Canal</Label>
            <Select
              value={channel}
              onChange={(event) => replace({ channel: event.target.value || null })}
            >
              <option value="">Todos permitidos</option>
              {(options.data?.channels ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName || item.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {period === "custom" ? (
          <div className="mt-3 grid max-w-lg gap-3 sm:grid-cols-2">
            <div>
              <Label>Início</Label>
              <Input
                type="date"
                value={from}
                onChange={(event) => replace({ start: event.target.value || null })}
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type="date"
                value={to}
                onChange={(event) => replace({ end: event.target.value || null })}
              />
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-[11px] text-muted-foreground">Filtros persistem entre as áreas.</p>
      </section>
      {area.error ? <ErrorBanner message={(area.error as Error).message} /> : null}
      {area.isLoading && !area.data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      ) : null}
      {tab === "overview" && area.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Valor em aberto"
              value={money(metrics.negotiatingValue)}
              icon={WalletCards}
            />
            <Metric label="Valor ganho" value={money(metrics.confirmedRevenue)} icon={TrendingUp} />
            <Metric label="Leads abertos" value={number(metrics.openDeals)} icon={BarChart3} />
            <Metric label="Pedidos" value={number(metrics.salesCount)} icon={ShoppingBag} />
            <Metric
              label="Aguardando resposta"
              value={number(metrics.waitingConversations)}
              icon={MessagesSquare}
            />
            <Metric
              label="Tarefas atrasadas"
              value={number(metrics.overdueTasks)}
              icon={AlertTriangle}
            />
            <Metric label="Clientes em recompra" value={number(metrics.repurchaseReady)} />
            <Metric
              label="Conversão"
              value={
                typeof metrics.conversionRate === "number" ? `${metrics.conversionRate}%` : "—"
              }
            />
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <AnalyticsChart
              title="Receita no período"
              kind="line"
              data={(data.revenueByPeriod as Array<Record<string, unknown>>) ?? []}
              valueFormatter={money}
            />
            <AnalyticsChart
              title="Receita por canal"
              data={((data.channelPerformance as Array<Record<string, unknown>>) ?? []).map(
                (row) => ({ label: row.label, value: row.revenue }),
              )}
              valueFormatter={money}
            />
          </div>
          <Ranking rows={(data.topSellers as Array<Record<string, unknown>>) ?? []} />
          <DimensionExplorer query={query} />
        </>
      ) : null}
      {tab === "commercial" && area.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Valor aberto" value={money(metrics.negotiatingValue)} />
            <Metric label="Receita confirmada" value={money(metrics.confirmedRevenue)} />
            <Metric label="Ticket médio" value={money(metrics.averageTicket)} />
            <Metric
              label="Ganhos / Perdidos"
              value={`${number(metrics.wonInPeriod)} / ${number(metrics.lostInPeriod)}`}
            />
          </div>
          <AnalyticsChart
            title="Evolução da receita"
            kind="line"
            data={(data.revenueByPeriod as Array<Record<string, unknown>>) ?? []}
            valueFormatter={money}
          />
          <Card>
            <CardHeader>
              <CardTitle>Funil comercial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {((data.funnel as Array<Record<string, unknown>>) ?? []).map((stage) => (
                <div key={String(stage.id)}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{String(stage.label)}</span>
                    <span>
                      {number(stage.count)} · {money(stage.value)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Number(stage.barWidthPct ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {Object.entries((data.availability ?? {}) as Record<string, string>).map(
                  ([key, value]) => (
                    <Availability key={key} value={value} />
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
      {tab === "attendance" && area.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Conversas iniciadas" value={number(data.conversations)} />
            <Metric label="Aguardando nossa resposta" value={number(data.waitingOurResponse)} />
            <Metric label="Aguardando cliente" value={number(data.waitingCustomer)} />
            <Metric label="Não lidas" value={number(data.unread)} />
            <Metric
              label="Tempo médio de resposta"
              value={minutes(data.averageMinutes)}
              icon={Clock3}
            />
            <Metric label="Mediana de resposta" value={minutes(data.medianMinutes)} />
            <Metric label="Iniciadas pela equipe" value={number(data.initiatedByTeam)} />
            <Metric label="Iniciadas pelo cliente" value={number(data.initiatedByCustomer)} />
          </div>
          <AnalyticsChart
            title="Distribuição do SLA"
            kind="donut"
            data={Object.entries((data.sla as Record<string, number>) ?? {}).map(
              ([label, value]) => ({ label, value }),
            )}
          />
          <Card>
            <CardHeader>
              <CardTitle>SLA de resposta</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-4">
              <Metric
                label="Até 5 min"
                value={number((data.sla as Record<string, unknown>)?.under5)}
              />
              <Metric
                label="6–15 min"
                value={number((data.sla as Record<string, unknown>)?.under15)}
              />
              <Metric
                label="16–60 min"
                value={number((data.sla as Record<string, unknown>)?.under60)}
              />
              <Metric
                label="Acima de 60 min"
                value={number((data.sla as Record<string, unknown>)?.over60)}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
      {tab === "team" && area.data ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Pódio comercial</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {((data.podium as Array<Record<string, unknown>>) ?? []).map((row, index) => (
                <Metric
                  key={String(row.id)}
                  label={`${index + 1}º · ${String(row.name)}`}
                  value={money(row.revenue)}
                  note={
                    typeof row.conversionRate === "number"
                      ? `${row.conversionRate}% de conversão`
                      : "Sem base de conversão"
                  }
                />
              ))}
            </CardContent>
          </Card>
          <AnalyticsChart
            title="Receita por pessoa"
            data={((data.ranking as Array<Record<string, unknown>>) ?? []).map((row) => ({
              label: row.name,
              value: row.revenue,
            }))}
            valueFormatter={money}
          />
          <Ranking rows={(data.ranking as Array<Record<string, unknown>>) ?? []} />
        </>
      ) : null}
      {tab === "goals" ? <GoalsPanel data={goals.data} options={options.data} /> : null}
      {tab === "customers" && area.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Clientes novos" value={number(data.newCustomers)} />
            <Metric label="Clientes recorrentes" value={number(data.recurringCustomers)} />
            <Metric label="Receita de novos" value={money(data.newRevenue)} />
            <Metric label="Receita recorrente" value={money(data.recurringRevenue)} />
            <Metric label="Ticket novos" value={money(data.newTicket)} />
            <Metric label="Ticket recorrentes" value={money(data.recurringTicket)} />
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <AnalyticsChart
              title="Clientes novos × recorrentes"
              kind="donut"
              data={[
                { label: "Novos", value: data.newCustomers },
                { label: "Recorrentes", value: data.recurringCustomers },
              ]}
            />
            <AnalyticsChart
              title="Receita nova × recorrente"
              data={[
                { label: "Novos", value: data.newRevenue },
                { label: "Recorrentes", value: data.recurringRevenue },
              ]}
              valueFormatter={money}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Segmentos por tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {((data.tags as Array<Record<string, unknown>>) ?? []).length ? (
                (data.tags as Array<Record<string, unknown>>).map((tag) => (
                  <div
                    key={String(tag.id)}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <span className="font-medium">{String(tag.name)}</span>
                    <span>
                      {number(tag.orders)} pedidos · {money(tag.revenue)}
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState title="Sem tags associadas a compradores no período" />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
      {tab === "channels" && area.data ? (
        <>
          <AnalyticsChart
            title="Performance por canal"
            data={((data.ranking as Array<Record<string, unknown>>) ?? []).map((row) => ({
              label: row.label,
              value: row.revenue,
            }))}
            valueFormatter={money}
          />
          <Card>
            <CardHeader>
              <CardTitle>Performance por canal</CardTitle>
            </CardHeader>
            <CardContent>
              {((data.ranking as Array<Record<string, unknown>>) ?? []).length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left">Canal</th>
                        <th className="text-right">Leads</th>
                        <th className="text-right">Pedidos</th>
                        <th className="text-right">Receita</th>
                        <th className="text-right">Conversão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.ranking as Array<Record<string, unknown>>).map((row) => (
                        <tr key={String(row.label)} className="border-b">
                          <td className="py-3 font-medium">{String(row.label)}</td>
                          <td className="text-right">{number(row.leads)}</td>
                          <td className="text-right">{number(row.sales)}</td>
                          <td className="text-right">{money(row.revenue)}</td>
                          <td className="text-right">
                            {typeof row.conversionRate === "number"
                              ? `${row.conversionRate}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="Selecione um canal permitido para analisar"
                  description="Canais pessoais e de pipeline respeitam a matriz de acesso."
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
