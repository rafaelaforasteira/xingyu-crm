"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Clock3,
  Headphones,
  Kanban,
  MessagesSquare,
  Radio,
  ShoppingBag,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-controls";
import { FilterSelect } from "@/components/ui/filter-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { AnalyticsChart, RevenueComparisonChart } from "./analytics-charts";
import {
  CUSTOMERS_DEMO_DATA,
  CustomerInsights,
  CustomerInsightsSkeleton,
  type CustomerAnalyticsData,
} from "./customer-insights";
import { GoalsPanel } from "./goals-panel";
import { DimensionExplorer } from "./dimension-explorer";
import { DashboardTabs, DASHBOARD_TABS, type DashboardTab } from "./dashboard-tabs";
import { cn } from "@/lib/utils";

type Tab = DashboardTab;
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

const ATTENDANCE_DEMO = {
  conversations: 248,
  waitingOurResponse: 12,
  waitingCustomer: 31,
  unread: 18,
  averageMinutes: 8.4,
  medianMinutes: 5.2,
  initiatedByTeam: 96,
  initiatedByCustomer: 152,
  sla: { under5: 126, under15: 71, under60: 36, over60: 15 },
  responseByPeriod: [
    { label: "Seg", value: 11, target: 15 },
    { label: "Ter", value: 8, target: 15 },
    { label: "Qua", value: 6, target: 15 },
    { label: "Qui", value: 9, target: 15 },
    { label: "Sex", value: 7, target: 15 },
    { label: "Sáb", value: 13, target: 15 },
    { label: "Dom", value: 5, target: 15 },
  ],
  byOwner: [
    { label: "Ana Souza", value: 4.8 },
    { label: "Carlos Lima", value: 7.1 },
    { label: "Marina Alves", value: 9.6 },
    { label: "João Pedro", value: 13.2 },
  ],
  byChannel: [
    { label: "WhatsApp", value: 164 },
    { label: "Site / Shopify", value: 46 },
    { label: "E-mail", value: 25 },
    { label: "Manual", value: 13 },
  ],
  outsideSla: [
    { name: "Fernanda Costa", channel: "WhatsApp", wait: "1h 18min", owner: "João Pedro" },
    { name: "Loja Aurora", channel: "Site / Shopify", wait: "1h 07min", owner: "Marina Alves" },
    { name: "Ricardo Mendes", channel: "WhatsApp", wait: "1h 02min", owner: "Carlos Lima" },
  ],
};

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
  href,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  note?: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  tone?: "default" | "success" | "danger" | "orange" | "yellow";
}) {
  const card = (
    <Card
      className={cn(
        "min-w-0 transition",
        href && "group h-full hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-card",
        tone === "success" && "border-emerald-200 bg-emerald-50/45",
        tone === "danger" && "border-red-200 bg-red-50/45",
        tone === "orange" && "border-orange-200 bg-orange-50/45",
        tone === "yellow" && "border-yellow-200 bg-yellow-50/50",
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="flex items-center gap-1.5">
            {Icon ? (
              <Icon
                className={cn(
                  "h-4 w-4 text-primary",
                  tone === "success" && "text-emerald-600",
                  tone === "danger" && "text-red-600",
                  tone === "orange" && "text-orange-600",
                  tone === "yellow" && "text-yellow-600",
                )}
              />
            ) : null}
            {href ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-primary" />
            ) : null}
          </div>
        </div>
        <p
          className={cn(
            "mt-2 truncate text-2xl font-semibold tracking-tight",
            tone === "success" && "text-emerald-700",
            tone === "danger" && "text-red-700",
            tone === "orange" && "text-orange-700",
            tone === "yellow" && "text-yellow-700",
          )}
        >
          {value}
        </p>
        {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block min-w-0">
      {card}
    </Link>
  ) : (
    card
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

function Ranking({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (!rows.length) return <EmptyState icon={UsersRound} title="Sem dados para o ranking" />;
  const hasRevenue = rows.some((row) => Number(row.revenue ?? 0) > 0);
  const usefulRows = hasRevenue ? rows.filter((row) => Number(row.revenue ?? 0) > 0) : rows;
  const orderedRows = [...usefulRows].sort((a, b) =>
    hasRevenue
      ? Number(b.revenue ?? 0) - Number(a.revenue ?? 0)
      : Number(b.openDeals ?? 0) - Number(a.openDeals ?? 0),
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="border-b border-border/70 px-4 py-3">
        <h2 className="text-sm font-semibold">
          {hasRevenue ? "Ranking por receita" : "Ranking por negócios abertos"}
        </h2>
      </div>
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
          {orderedRows.map((row, index) => (
            <tr key={String(row.id ?? index)} className="border-b last:border-0">
              <td className="px-4 py-3 font-semibold">{`${index + 1}º`}</td>
              <td className="px-4 py-3 font-medium">{String(row.name ?? "—")}</td>
              <td className="px-4 py-3 text-right">{money(row.revenue)}</td>
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

type TeamPerformanceRow = {
  id: string;
  name: string;
  revenue: number;
  conversionRate: number;
  averageTicket: number;
  openDeals: number;
  overdueTasks: number;
  waitingConversations: number;
};

function TeamPodium({ rows }: { rows: TeamPerformanceRow[] }) {
  const highlights = rows.filter((row) => row.revenue > 0).slice(0, 3);
  const tones = [
    "border-amber-200 bg-amber-50/55",
    "border-slate-200 bg-slate-50/70",
    "border-orange-200 bg-orange-50/45",
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-amber-500" /> Destaques comerciais
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          As três maiores receitas do período selecionado.
        </p>
      </CardHeader>
      <CardContent
        className={cn("grid gap-3", highlights.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3")}
      >
        {highlights.map((row, index) => (
          <div key={row.id} className={cn("rounded-xl border p-4", tones[index])}>
            <div className="flex items-center gap-3">
              <Avatar name={row.name} size="md" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">{index + 1}º lugar</p>
                <p className="truncate text-sm font-semibold">{row.name}</p>
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight">{money(row.revenue)}</p>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{number(row.conversionRate)}% conversão</span>
              <span>{number(row.openDeals)} abertos</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TeamRanking({ rows }: { rows: TeamPerformanceRow[] }) {
  const [sort, setSort] = React.useState<keyof TeamPerformanceRow>("revenue");
  const ordered = [...rows].sort((a, b) => Number(b[sort] ?? 0) - Number(a[sort] ?? 0));
  const columns: Array<{ key: keyof TeamPerformanceRow; label: string }> = [
    { key: "revenue", label: "Receita" },
    { key: "conversionRate", label: "Conversão" },
    { key: "averageTicket", label: "Ticket médio" },
    { key: "openDeals", label: "Em aberto" },
    { key: "overdueTasks", label: "Tarefas atrasadas" },
  ];
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Desempenho da equipe</CardTitle>
        <p className="text-xs text-muted-foreground">
          Clique em uma coluna para reorganizar o ranking.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-y bg-muted/35 text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Posição</th>
              <th className="px-5 py-3 text-left font-medium">Pessoa</th>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => setSort(column.key)}
                    className={cn(
                      "hover:text-primary",
                      sort === column.key && "font-semibold text-primary",
                    )}
                  >
                    {column.label}
                    {sort === column.key ? " ↓" : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordered.map((row, index) => (
              <tr
                key={row.id}
                className="border-b border-border/70 last:border-0 hover:bg-muted/20"
              >
                <td className="px-5 py-3 font-semibold">{index + 1}º</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={row.name} size="sm" />
                    <span className="font-medium">{row.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium">{money(row.revenue)}</td>
                <td className="px-4 py-3 text-right">{number(row.conversionRate)}%</td>
                <td className="px-4 py-3 text-right">{money(row.averageTicket)}</td>
                <td className="px-4 py-3 text-right">{number(row.openDeals)}</td>
                <td
                  className={cn(
                    "px-4 py-3 text-right",
                    row.overdueTasks > 0 && "font-semibold text-red-600",
                  )}
                >
                  {number(row.overdueTasks)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function PipelinePerformance({ rows }: { rows: Array<Record<string, unknown>> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas por pipeline</CardTitle>
        <p className="text-xs text-muted-foreground">
          Compare carteira aberta, receita confirmada e eficiência comercial.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="pb-3 text-left font-medium">Pipeline</th>
              <th className="pb-3 text-right font-medium">Abertos</th>
              <th className="pb-3 text-right font-medium">Valor em aberto</th>
              <th className="pb-3 text-right font-medium">Receita</th>
              <th className="pb-3 text-right font-medium">Conversão</th>
              <th className="pb-3 text-right font-medium">Ticket médio</th>
              <th className="pb-3 pl-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={String(row.id)}
                className="border-b border-border/60 transition hover:bg-muted/25 last:border-0"
              >
                <td className="py-3 font-medium">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Kanban className="h-4 w-4" />
                    </span>
                    <span>{String(row.name)}</span>
                  </div>
                </td>
                <td className="py-3 text-right tabular-nums">{number(row.openDeals)}</td>
                <td className="py-3 text-right font-medium tabular-nums">{money(row.openValue)}</td>
                <td className="py-3 text-right font-semibold text-emerald-700 tabular-nums">
                  {money(row.revenue)}
                </td>
                <td className="py-3 text-right tabular-nums">
                  {typeof row.conversionRate === "number" ? `${number(row.conversionRate)}%` : "—"}
                </td>
                <td className="py-3 text-right tabular-nums">{money(row.averageTicket)}</td>
                <td className="py-3 pl-3 text-right">
                  {row.id ? (
                    <Link
                      href={`/pipelines/${String(row.id)}`}
                      aria-label={`Abrir pipeline ${String(row.name)}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="inline-block h-8 w-8" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function CommercialOpportunityList({
  title,
  description,
  rows,
  kind,
}: {
  title: string;
  description: string;
  rows: Array<Record<string, unknown>>;
  kind: "closing" | "stalled";
}) {
  const Icon = kind === "closing" ? Target : Clock3;
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              kind === "closing"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-orange-100 text-orange-700",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {!rows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum negócio neste recorte.
          </p>
        ) : (
          rows.map((row) => {
            const owner = row.owner as { name?: string; avatarUrl?: string | null } | null;
            const stage = row.stage as { name?: string } | null;
            return (
              <Link
                key={String(row.id)}
                href={`/pipelines/${String(row.pipelineId)}/deals/${String(row.id)}`}
                className="grid grid-cols-[58px_minmax(0,1fr)_32px_100px] items-center gap-3 border-b border-border/60 px-2 py-3 transition hover:bg-muted/50 last:border-0"
              >
                <span className="inline-flex h-7 items-center justify-center rounded-lg bg-primary/10 px-2 text-[11px] font-semibold tabular-nums text-primary">
                  #{row.leadSequence == null ? "—" : String(row.leadSequence).padStart(4, "0")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {String(row.contactName || row.name)}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {stage?.name ?? "Sem etapa"} ·{" "}
                    {kind === "closing"
                      ? `${number(row.probability)}% de probabilidade`
                      : `${number(row.idleDays)} dias sem interação`}
                  </p>
                </div>
                <span className="flex justify-center">
                  {owner ? <Avatar name={owner.name} src={owner.avatarUrl} size="sm" /> : null}
                </span>
                <strong className="whitespace-nowrap text-right text-xs tabular-nums">
                  {money(row.value)}
                </strong>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requestedTab = params.get("tab") as Tab | null;
  const tab = DASHBOARD_TABS.some((item) => item.value === requestedTab)
    ? requestedTab!
    : "overview";
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
  const showingCustomersDemo =
    process.env.NODE_ENV !== "production" && params.get("demo") === "customers";
  const customerData: CustomerAnalyticsData = showingCustomersDemo
    ? CUSTOMERS_DEMO_DATA
    : {
        newCustomers: Number(data.newCustomers ?? 0),
        recurringCustomers: Number(data.recurringCustomers ?? 0),
        newRevenue: Number(data.newRevenue ?? 0),
        recurringRevenue: Number(data.recurringRevenue ?? 0),
        newTicket: typeof data.newTicket === "number" ? data.newTicket : null,
        recurringTicket: typeof data.recurringTicket === "number" ? data.recurringTicket : null,
        tags: ((data.tags as Array<Record<string, unknown>> | undefined) ?? []).map((tag) => ({
          id: String(tag.id ?? tag.name),
          name: String(tag.name ?? "Sem nome"),
          color: typeof tag.color === "string" ? tag.color : null,
          customers: typeof tag.customers === "number" ? tag.customers : null,
          orders: Number(tag.orders ?? 0),
          revenue: Number(tag.revenue ?? 0),
        })),
      };
  const metrics = (data.metrics ?? {}) as Record<string, unknown>;
  const showingAttendanceDemo =
    tab === "attendance" &&
    Number(data.conversations ?? 0) === 0 &&
    Number(data.waitingOurResponse ?? 0) === 0 &&
    Number(data.unread ?? 0) === 0;
  const attendance = (showingAttendanceDemo ? ATTENDANCE_DEMO : data) as typeof ATTENDANCE_DEMO &
    Record<string, unknown>;
  const attendanceSla = attendance.sla as Record<string, number>;
  const attendanceSlaTotal = Object.values(attendanceSla ?? {}).reduce(
    (total, value) => total + Number(value ?? 0),
    0,
  );
  const attendanceSlaMet = Number(attendanceSla?.under5 ?? 0) + Number(attendanceSla?.under15 ?? 0);
  const attendanceSlaRate = attendanceSlaTotal
    ? Math.round((attendanceSlaMet / attendanceSlaTotal) * 100)
    : 0;
  const teamRows = ((data.ranking as Array<Record<string, unknown>>) ?? []).map(
    (row): TeamPerformanceRow => ({
      id: String(row.id ?? row.name),
      name: String(row.name ?? "Sem nome"),
      revenue: Number(row.revenue ?? 0),
      conversionRate: Number(row.conversionRate ?? 0),
      averageTicket: Number(row.averageTicket ?? 0),
      openDeals: Number(row.openDeals ?? 0),
      overdueTasks: Number(row.overdueTasks ?? 0),
      waitingConversations: Number(row.waitingConversations ?? 0),
    }),
  );
  const teamRevenue = teamRows.reduce((total, row) => total + row.revenue, 0);
  const teamOpenDeals = teamRows.reduce((total, row) => total + row.openDeals, 0);
  const teamAttention = teamRows.reduce(
    (total, row) => total + row.overdueTasks + row.waitingConversations,
    0,
  );
  const teamWithConversion = teamRows.filter((row) => row.conversionRate > 0);
  const teamAverageConversion = teamWithConversion.length
    ? teamWithConversion.reduce((total, row) => total + row.conversionRate, 0) /
      teamWithConversion.length
    : 0;

  return (
    <div
      className="mx-auto w-full max-w-[1500px] space-y-5"
      data-testid="dashboard-intelligence-center"
    >
      <PageHeader title="Dados" description="Visão geral da operação." />
      <DashboardTabs
        value={tab}
        onValueChange={(value) => replace({ tab: value === "overview" ? null : value })}
      />
      <section className="rounded-xl border border-border bg-card p-3 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FilterSelect
            label="Período"
            icon={CalendarDays}
            value={period}
            aria-label="Filtrar por período"
            options={[
              { value: "today", label: "Hoje" },
              { value: "7d", label: "Últimos 7 dias" },
              { value: "30d", label: "Últimos 30 dias" },
              { value: "month", label: "Este mês" },
              { value: "previous-month", label: "Mês anterior" },
              { value: "custom", label: "Personalizado" },
            ]}
            onChange={(value) =>
              replace({
                period: value === "30d" ? null : value,
                start: null,
                end: null,
              })
            }
          />
          <FilterSelect
            label="Pipeline"
            icon={Kanban}
            value={pipelineId}
            aria-label="Filtrar por pipeline"
            options={[
              { value: "", label: "Todos acessíveis" },
              ...(options.data?.pipelines ?? []).map((item) => ({
                value: item.id,
                label: item.name,
              })),
            ]}
            onChange={(value) => replace({ pipeline: value || null })}
          />
          <FilterSelect
            label="Equipe"
            icon={UsersRound}
            value={teamId}
            aria-label="Filtrar por equipe"
            options={[
              { value: "", label: "Todas permitidas" },
              ...(options.data?.teams ?? []).map((item) => ({ value: item.id, label: item.name })),
            ]}
            onChange={(value) => replace({ team: value || null, responsible: null })}
          />
          <FilterSelect
            label="Responsável"
            icon={UserRound}
            value={ownerId}
            aria-label="Filtrar por responsável"
            options={[
              { value: "", label: "Todos permitidos" },
              ...(options.data?.users ?? [])
                .filter((item) => !teamId || item.teamId === teamId)
                .map((item) => ({ value: item.id, label: item.name })),
            ]}
            onChange={(value) => replace({ responsible: value || null })}
          />
          <FilterSelect
            label="Canal"
            icon={Radio}
            value={channel}
            aria-label="Filtrar por canal"
            options={[
              { value: "", label: "Todos permitidos" },
              ...(options.data?.channels ?? []).map((item) => ({
                value: item.id,
                label: item.displayName || item.name,
              })),
            ]}
            onChange={(value) => replace({ channel: value || null })}
          />
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
      </section>
      {area.error ? <ErrorBanner message={(area.error as Error).message} /> : null}
      {area.isLoading && !area.data && tab === "customers" ? (
        <CustomerInsightsSkeleton />
      ) : area.isLoading && !area.data ? (
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
              label="Receita confirmada"
              value={money(metrics.confirmedRevenue)}
              icon={TrendingUp}
              href="/finance"
            />
            <Metric
              label="Valor em aberto"
              value={money(metrics.negotiatingValue)}
              icon={WalletCards}
              href="/pipelines"
            />
            <Metric
              label="Pedidos confirmados"
              value={number(metrics.salesCount)}
              icon={ShoppingBag}
              href="/orders"
            />
            <Metric
              label="Conversão"
              value={
                typeof metrics.conversionRate === "number"
                  ? `${metrics.conversionRate}%`
                  : "Sem fechamentos"
              }
              icon={BarChart3}
              href="/pipelines"
            />
            <Metric
              label="Aguardando nossa resposta"
              value={number(metrics.waitingConversations)}
              icon={MessagesSquare}
              href="/pipelines"
              tone="danger"
            />
            <Metric
              label="Tarefas atrasadas"
              value={number(metrics.overdueTasks)}
              icon={AlertTriangle}
              href="/tasks"
              tone="danger"
            />
            <Metric
              label="Negócios abertos"
              value={number(metrics.openDeals)}
              icon={BarChart3}
              href="/pipelines"
              tone="orange"
            />
            <Metric
              label="Clientes prontos para recompra"
              value={number(metrics.repurchaseReady)}
              icon={UsersRound}
              href="/clients"
              tone="yellow"
            />
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <AnalyticsChart
              title="Receita no período"
              kind="line"
              data={(data.revenueByPeriod as Array<Record<string, unknown>>) ?? []}
              valueFormatter={money}
              emptyMessage="Nenhuma receita confirmada neste período."
            />
            <AnalyticsChart
              title="Receita por canal"
              kind="horizontal-bar"
              data={((data.channelPerformance as Array<Record<string, unknown>>) ?? [])
                .map((row) => ({ label: row.label, value: row.revenue }))
                .filter((row) => Number(row.value ?? 0) > 0)}
              valueFormatter={money}
              emptyMessage="Nenhuma receita por canal neste período."
            />
          </div>
          <Ranking rows={(data.topSellers as Array<Record<string, unknown>>) ?? []} />
          <DimensionExplorer query={query} />
        </>
      ) : null}
      {tab === "commercial" && area.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Receita confirmada"
              value={money(metrics.confirmedRevenue)}
              note={
                typeof metrics.confirmedRevenueDeltaPct === "number"
                  ? `${metrics.confirmedRevenueDeltaPct >= 0 ? "+" : ""}${number(metrics.confirmedRevenueDeltaPct)}% em relação ao período anterior`
                  : "Pedidos confirmados no período"
              }
              icon={TrendingUp}
              tone="success"
            />
            <Metric
              label="Valor em negociação"
              value={money(metrics.negotiatingValue)}
              note={`${number(metrics.openDeals)} negócios ativos`}
              icon={WalletCards}
              tone="orange"
            />
            <Metric
              label="Conversão"
              value={
                typeof metrics.conversionRate === "number"
                  ? `${number(metrics.conversionRate)}%`
                  : "Sem fechamentos"
              }
              note={`${number(metrics.wonInPeriod)} ganhos de ${number(metrics.conversionDenominator)} encerrados`}
              icon={BarChart3}
            />
            <Metric
              label="Ticket médio"
              value={money(metrics.averageTicket)}
              note="Por pedido confirmado"
              icon={ShoppingBag}
            />
          </div>
          <RevenueComparisonChart
            data={(data.revenueByPeriod as Array<Record<string, unknown>>) ?? []}
          />
          <PipelinePerformance
            rows={(data.pipelinePerformance as Array<Record<string, unknown>>) ?? []}
          />
          <div className="grid gap-3 xl:grid-cols-2">
            <CommercialOpportunityList
              title="Próximos fechamentos"
              description="Oportunidades abertas com maior probabilidade e valor."
              rows={(data.topOpportunities as Array<Record<string, unknown>>) ?? []}
              kind="closing"
            />
            <CommercialOpportunityList
              title="Negócios parados"
              description="Oportunidades sem interação há três dias ou mais."
              rows={(data.stalledOpportunities as Array<Record<string, unknown>>) ?? []}
              kind="stalled"
            />
          </div>
        </>
      ) : null}
      {tab === "attendance" && area.data ? (
        <>
          {showingAttendanceDemo ? (
            <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50/55 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-violet-900">Visualização demonstrativa</p>
                <p className="text-xs text-violet-700">
                  Estes dados são fictícios e serão substituídos automaticamente quando houver
                  atendimentos no período.
                </p>
              </div>
              <Badge className="shrink-0 bg-violet-600 text-white hover:bg-violet-600">
                Demonstração
              </Badge>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Conversas iniciadas"
              value={number(attendance.conversations)}
              note="Total recebido no período"
              icon={MessagesSquare}
            />
            <Metric
              label="Aguardando nossa resposta"
              value={number(attendance.waitingOurResponse)}
              note="Precisam de atenção da equipe"
              icon={AlertTriangle}
              tone="danger"
            />
            <Metric
              label="Tempo médio de resposta"
              value={minutes(attendance.averageMinutes)}
              note={`Mediana de ${minutes(attendance.medianMinutes)}`}
              icon={Clock3}
              tone="orange"
            />
            <Metric
              label="SLA cumprido"
              value={`${attendanceSlaRate}%`}
              note={`${number(attendanceSlaMet)} respostas em até 15 min`}
              icon={Target}
              tone="success"
            />
          </div>
          <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
            <AnalyticsChart
              title="Tempo de resposta no período"
              kind="line"
              data={(attendance.responseByPeriod as Array<Record<string, unknown>>) ?? []}
              secondaryKey="target"
              valueFormatter={(value) => `${number(value)} min`}
              axisFormatter={(value) => `${value} min`}
              emptyMessage="Ainda não há histórico de tempo de resposta neste período."
            />
            <AnalyticsChart
              title="Distribuição do SLA"
              kind="donut"
              data={[
                { label: "Até 5 min", value: Number(attendanceSla?.under5 ?? 0) },
                { label: "6–15 min", value: Number(attendanceSla?.under15 ?? 0) },
                { label: "16–60 min", value: Number(attendanceSla?.under60 ?? 0) },
                { label: "Acima de 60 min", value: Number(attendanceSla?.over60 ?? 0) },
              ]}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Aguardando cliente"
              value={number(attendance.waitingCustomer)}
              note="Equipe já respondeu"
              icon={Clock3}
              tone="yellow"
            />
            <Metric
              label="Não lidas"
              value={number(attendance.unread)}
              note="Mensagens ainda não visualizadas"
              icon={MessagesSquare}
              tone="danger"
            />
            <Metric
              label="Iniciadas pelo cliente"
              value={number(attendance.initiatedByCustomer)}
              note="Entradas espontâneas"
              icon={UserRound}
            />
            <Metric
              label="Iniciadas pela equipe"
              value={number(attendance.initiatedByTeam)}
              note="Abordagens ativas"
              icon={Headphones}
            />
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <AnalyticsChart
              title="Tempo médio por responsável"
              kind="horizontal-bar"
              data={(attendance.byOwner as Array<Record<string, unknown>>) ?? []}
              valueFormatter={(value) => `${number(value)} min`}
              axisFormatter={(value) => `${value} min`}
              emptyMessage="Ainda não há dados suficientes por responsável."
            />
            <AnalyticsChart
              title="Volume por canal"
              kind="horizontal-bar"
              data={(attendance.byChannel as Array<Record<string, unknown>>) ?? []}
              valueFormatter={(value) => `${number(value)} conversas`}
              emptyMessage="Ainda não há conversas distribuídas por canal."
            />
          </div>
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Conversas fora do SLA</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Atendimentos que ultrapassaram 60 minutos sem resposta.
                </p>
              </div>
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                {number((attendance.outsideSla as unknown[])?.length ?? attendanceSla?.over60 ?? 0)}{" "}
                pendentes
              </Badge>
            </CardHeader>
            <CardContent>
              {(
                attendance.outsideSla as
                  Array<{ name: string; channel: string; wait: string; owner: string }> | undefined
              )?.length ? (
                <div className="divide-y divide-border/70">
                  {(
                    attendance.outsideSla as Array<{
                      name: string;
                      channel: string;
                      wait: string;
                      owner: string;
                    }>
                  ).map((conversation) => (
                    <div
                      key={`${conversation.name}-${conversation.wait}`}
                      className="grid gap-2 py-3 text-sm sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center"
                    >
                      <span className="font-medium">{conversation.name}</span>
                      <span className="text-muted-foreground">{conversation.channel}</span>
                      <span className="text-muted-foreground">{conversation.owner}</span>
                      <span className="font-semibold text-red-600">{conversation.wait}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-6 py-10 text-center">
                  <p className="text-sm font-medium">Nenhuma conversa fora do SLA.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Os atendimentos críticos aparecerão aqui.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
      {tab === "team" && area.data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Receita da equipe"
              value={money(teamRevenue)}
              note={`${teamRows.filter((row) => row.revenue > 0).length} pessoas com vendas`}
              icon={TrendingUp}
              tone="success"
            />
            <Metric
              label="Conversão média"
              value={`${number(teamAverageConversion)}%`}
              note="Entre pessoas com conversões"
              icon={Target}
            />
            <Metric
              label="Negócios em aberto"
              value={number(teamOpenDeals)}
              note="Carteira ativa da equipe"
              icon={BriefcaseBusiness}
              tone="orange"
            />
            <Metric
              label="Pontos de atenção"
              value={number(teamAttention)}
              note="Tarefas atrasadas e clientes esperando"
              icon={AlertTriangle}
              tone={teamAttention > 0 ? "danger" : "success"}
            />
          </div>
          {teamRows.some((row) => row.revenue > 0) ? (
            <TeamPodium rows={[...teamRows].sort((a, b) => b.revenue - a.revenue)} />
          ) : null}
          <div className="grid gap-3 xl:grid-cols-2">
            <AnalyticsChart
              title="Receita por pessoa"
              kind="horizontal-bar"
              data={teamRows
                .filter((row) => row.revenue > 0)
                .sort((a, b) => b.revenue - a.revenue)
                .map((row) => ({ label: row.name, value: row.revenue }))}
              valueFormatter={money}
              axisFormatter={(value) =>
                value >= 1000 ? `R$ ${number(value / 1000)} mil` : `R$ ${number(value)}`
              }
              emptyMessage="A equipe ainda não registrou receita no período."
            />
            <AnalyticsChart
              title="Conversão por pessoa"
              kind="horizontal-bar"
              data={teamRows
                .filter((row) => row.conversionRate > 0)
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .map((row) => ({ label: row.name, value: row.conversionRate }))}
              valueFormatter={(value) => `${number(value)}%`}
              axisFormatter={(value) => `${value}%`}
              emptyMessage="Ainda não há base para calcular conversão."
            />
          </div>
          {teamRows.length ? (
            <TeamRanking rows={teamRows} />
          ) : (
            <EmptyState icon={UsersRound} title="Sem dados da equipe neste período" />
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Equipe que precisa de atenção</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Pendências operacionais que podem impactar os resultados.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {teamRows.filter((row) => row.overdueTasks > 0 || row.waitingConversations > 0)
                  .length ? (
                  teamRows
                    .filter((row) => row.overdueTasks > 0 || row.waitingConversations > 0)
                    .sort(
                      (a, b) =>
                        b.overdueTasks +
                        b.waitingConversations -
                        (a.overdueTasks + a.waitingConversations),
                    )
                    .map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar name={row.name} size="sm" />
                          <span className="text-sm font-medium">{row.name}</span>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-semibold text-red-600">
                            {number(row.overdueTasks)} atrasadas
                          </span>
                          <span className="ml-3 text-muted-foreground">
                            {number(row.waitingConversations)} esperando
                          </span>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Nenhuma pendência relevante no período.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição de oportunidades</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Identifique pessoas sem carteira ou com poucas oportunidades.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {[...teamRows]
                  .sort((a, b) => a.openDeals - b.openDeals)
                  .slice(0, 5)
                  .map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={row.name} size="sm" />
                        <span className="text-sm font-medium">{row.name}</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          row.openDeals === 0 && "border-amber-200 bg-amber-50 text-amber-700",
                        )}
                      >
                        {row.openDeals === 0
                          ? "Sem oportunidades"
                          : `${number(row.openDeals)} negócios`}
                      </Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
      {tab === "goals" ? <GoalsPanel data={goals.data} options={options.data} /> : null}
      {tab === "customers" && area.data ? (
        <CustomerInsights data={customerData} demo={showingCustomersDemo} />
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
