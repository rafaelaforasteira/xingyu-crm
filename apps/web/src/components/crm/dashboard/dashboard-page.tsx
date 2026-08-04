"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi, pipelinesApi, settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/components/auth/auth-provider";
import { useUiStore } from "@/stores/ui";
import { ErrorBanner } from "@/components/crm/page-header";
import { DashboardHeader } from "@/components/crm/dashboard/dashboard-header";
import {
  DashboardFilters,
  DEFAULT_DASHBOARD_FILTERS,
  type DashboardFilterState,
} from "@/components/crm/dashboard/dashboard-filters";
import { KpiCard, formatKpiMoney } from "@/components/crm/dashboard/kpi-card";
import { AttentionPanel } from "@/components/crm/dashboard/attention-panel";
import { CommercialFunnel } from "@/components/crm/dashboard/commercial-funnel";
import {
  ChannelPerformance,
  RevenueChart,
} from "@/components/crm/dashboard/revenue-and-channels";
import {
  DealsRequiringAction,
  TeamPerformance,
  TodayTasks,
  WaitingConversations,
} from "@/components/crm/dashboard/operational-lists";
import { JourneySummaryCards } from "@/components/crm/dashboard/journey-summary-cards";

function awaitingPaymentHref(metrics?: {
  awaitingPaymentPipelineId?: string | null;
  awaitingPaymentStageId?: string | null;
  pipelineId?: string;
}) {
  if (metrics?.awaitingPaymentPipelineId && metrics.awaitingPaymentStageId) {
    return `/pipelines/${metrics.awaitingPaymentPipelineId}?stageId=${metrics.awaitingPaymentStageId}`;
  }
  if (metrics?.pipelineId) {
    return `/pipelines/${metrics.pipelineId}`;
  }
  return "/pipelines";
}

function stalledDealsHref(pipelineId?: string) {
  if (pipelineId) return `/pipelines/${pipelineId}?idleDays=3`;
  return "/pipelines?idleDays=3";
}

export function DashboardPage() {
  const { user } = useAuth();
  const selectedTeamId = useUiStore((s) => s.selectedTeamId);
  const canSeeTeam = user?.role === "ADMIN" || user?.role === "MANAGER";

  // Keep SSR/client first paint identical — role defaults apply after mount.
  const [filters, setFilters] = React.useState<DashboardFilterState>(
    DEFAULT_DASHBOARD_FILTERS,
  );

  React.useEffect(() => {
    if (!user) return;
    if (user.role === "CONSULTANT") {
      setFilters((current) => ({
        ...current,
        scope: "me",
        ownerId: user.id,
      }));
      return;
    }
    setFilters((current) =>
      current.scope === "me" && !current.ownerId
        ? { ...current, scope: "company", ownerId: "" }
        : current,
    );
  }, [user?.id, user?.role]);

  const customReady =
    filters.period !== "custom" ||
    (Boolean(filters.from) &&
      Boolean(filters.to) &&
      filters.from <= filters.to);

  const queryParams = React.useMemo(() => {
    const params: Record<string, string> = { period: filters.period };
    if (filters.period === "custom" && filters.from && filters.to) {
      params.from = filters.from;
      params.to = filters.to;
    }
    if (filters.pipelineId) params.pipelineId = filters.pipelineId;
    if (filters.ownerId) params.ownerId = filters.ownerId;
    else if (filters.scope === "me" && user?.id) params.ownerId = user.id;
    if (filters.scope === "team" && selectedTeamId) params.teamId = selectedTeamId;
    if (filters.channel) params.channel = filters.channel;
    return params;
  }, [filters, selectedTeamId, user?.id]);

  const metrics = useQuery({
    queryKey: queryKeys.dashboard.metrics(queryParams),
    queryFn: () => dashboardApi.metrics(queryParams),
    enabled: customReady,
    retry: false,
    placeholderData: (previous) => previous,
  });
  const charts = useQuery({
    queryKey: queryKeys.dashboard.charts(queryParams),
    queryFn: () => dashboardApi.charts(queryParams),
    enabled: customReady,
    retry: false,
    placeholderData: (previous) => previous,
  });
  const lists = useQuery({
    queryKey: queryKeys.dashboard.lists(queryParams),
    queryFn: () => dashboardApi.lists(queryParams),
    enabled: customReady,
    retry: false,
    placeholderData: (previous) => previous,
  });
  const pipelines = useQuery({
    queryKey: queryKeys.pipelines.navigation,
    queryFn: () => pipelinesApi.navigation(),
    staleTime: 3 * 60_000,
  });
  const settings = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.overview(),
    staleTime: 60_000,
  });

  const m = metrics.data;

  const channelOptions = React.useMemo(() => {
    const fromCharts = (charts.data?.channelPerformance ?? []).map((c) => c.label);
    const fromSettings = (settings.data?.channels ?? [])
      .map((c) => c.name)
      .filter(Boolean);
    return [...new Set([...fromCharts, ...fromSettings])].filter(
      (label) => label !== "Outros",
    );
  }, [charts.data?.channelPerformance, settings.data?.channels]);

  const error =
    metrics.error || charts.error || lists.error
      ? "Não foi possível carregar parte dos dados da dashboard. Verifique a API e tente novamente."
      : null;

  const revenueDelta = m?.confirmedRevenueDeltaPct;
  const conversionDelta = m?.conversionDeltaPp;
  const paymentHref = awaitingPaymentHref({
    awaitingPaymentPipelineId: m?.awaitingPaymentPipelineId,
    awaitingPaymentStageId: m?.awaitingPaymentStageId,
    pipelineId: filters.pipelineId || undefined,
  });
  const negotiatingHref = filters.pipelineId
    ? `/pipelines/${filters.pipelineId}`
    : "/pipelines";

  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-4"
      data-testid="dashboard-page"
      data-period={filters.period}
    >
      <DashboardHeader />
      {error ? <ErrorBanner message={error} /> : null}

      <DashboardFilters
        value={filters}
        onChange={(next) => {
          if (!canSeeTeam) {
            setFilters({
              ...next,
              scope: "me",
              ownerId: user?.id ?? next.ownerId,
            });
            return;
          }
          if (next.scope === "me" && !next.ownerId && user?.id) {
            setFilters({ ...next, ownerId: user.id });
            return;
          }
          if (next.scope !== "me" && filters.scope === "me") {
            setFilters({ ...next, ownerId: next.ownerId === user?.id ? "" : next.ownerId });
            return;
          }
          setFilters(next);
        }}
        pipelines={(pipelines.data ?? []).map((p) => ({ id: p.id, name: p.name }))}
        users={(settings.data?.users ?? []).map((u) => ({ id: u.id, name: u.name }))}
        channels={channelOptions}
        canSeeTeam={canSeeTeam}
      />

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Receita confirmada"
          value={formatKpiMoney(m?.confirmedRevenue ?? m?.revenue)}
          hint={
            (m?.confirmedRevenue ?? m?.revenue) === 0
              ? "Ainda não existem vendas confirmadas no período selecionado."
              : "comparado ao período anterior"
          }
          delta={revenueDelta}
          deltaTone={
            revenueDelta == null ? "neutral" : revenueDelta >= 0 ? "up" : "down"
          }
          icon="R$"
          href="/orders"
          loading={metrics.isLoading && !m}
        />
        <KpiCard
          label="Em negociação"
          value={formatKpiMoney(m?.negotiatingValue ?? m?.pipelineValue)}
          hint={
            m?.openDeals != null ? (
              <strong>{m.openDeals} negócios abertos</strong>
            ) : (
              "ativos no pipeline"
            )
          }
          icon="R$"
          href={negotiatingHref}
          loading={metrics.isLoading && !m}
        />
        <KpiCard
          label="Aguardando pagamento"
          value={formatKpiMoney(m?.awaitingPaymentValue)}
          hint={
            m?.awaitingPaymentCount != null ? (
              <>
                <strong>{m.awaitingPaymentCount} clientes</strong> precisam de acompanhamento
              </>
            ) : (
              "negócios na etapa de pagamento"
            )
          }
          icon="R$"
          href={paymentHref}
          loading={metrics.isLoading && !m}
        />
        <KpiCard
          label="Taxa de conversão"
          value={
            m?.conversionRate != null
              ? `${m.conversionRate}%`
              : "Dados indisponíveis"
          }
          hint={
            m?.conversionRate != null
              ? `${m.wonInPeriod ?? 0} ganhos de ${m.conversionDenominator ?? 0} negócios encerrados (ganhos + perdidos)`
              : "Sem negócios encerrados no período para calcular a conversão."
          }
          delta={conversionDelta}
          deltaTone={
            conversionDelta == null ? "neutral" : conversionDelta >= 0 ? "up" : "down"
          }
          icon="%"
          href="/reports"
          loading={metrics.isLoading && !m}
        />
        <KpiCard
          label="Meta mensal"
          value={
            m?.monthlyGoal != null && m.monthlyGoalProgress != null
              ? `${m.monthlyGoalProgress}%`
              : "Não configurada"
          }
          hint={
            m?.monthlyGoal != null
              ? `${formatKpiMoney(m.confirmedRevenue ?? m.revenue)} de ${formatKpiMoney(m.monthlyGoal)}`
              : canSeeTeam
                ? "Defina metas em Configurações → Usuários."
                : "Nenhuma meta mensal foi configurada."
          }
          progress={m?.monthlyGoalProgress}
          icon="◎"
          href={m?.monthlyGoal != null ? "/reports" : "/settings/users"}
          loading={metrics.isLoading && !m}
        />
      </div>

      <AttentionPanel
        loading={metrics.isLoading && !m}
        alerts={[
          {
            id: "overdue",
            count: m?.overdueTasks ?? 0,
            label: "tarefas atrasadas",
            href: "/tasks?overdue=1",
            tone: "danger",
          },
          {
            id: "stalled",
            count: m?.stalledDeals ?? 0,
            label: "negócios parados há +3 dias",
            href: stalledDealsHref(filters.pipelineId || undefined),
            tone: "warning",
          },
          {
            id: "waiting",
            count: m?.waitingConversations ?? m?.unansweredLeads ?? 0,
            label: "clientes aguardando resposta",
            href: "/inbox?awaitingReply=1",
            tone: "info",
          },
          {
            id: "repurchase",
            count: m?.repurchaseReady ?? 0,
            label: "clientes prontos para recompra",
            href: "/repurchase",
            tone: "success",
          },
          {
            id: "aftersales",
            count: m?.afterSalesCritical ?? 0,
            label: "casos críticos de pós-venda",
            href: "/after-sales",
            tone: "danger",
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.1fr)_minmax(0,0.95fr)]">
        <CommercialFunnel
          stages={charts.data?.funnel ?? []}
          stats={charts.data?.funnelStats}
          loading={charts.isLoading && !charts.data}
          pipelineHref={
            filters.pipelineId ? `/pipelines/${filters.pipelineId}` : "/pipelines"
          }
        />
        <RevenueChart
          data={charts.data?.revenueByPeriod ?? charts.data?.revenueTrend ?? []}
          loading={charts.isLoading && !charts.data}
        />
        <ChannelPerformance
          data={charts.data?.channelPerformance ?? []}
          loading={charts.isLoading && !charts.data}
        />
      </div>

      <DealsRequiringAction
        items={lists.data?.dealsRequiringAction ?? lists.data?.recentDeals ?? []}
        loading={lists.isLoading && !lists.data}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TodayTasks
          today={lists.data?.tasksToday ?? []}
          overdue={lists.data?.overdueTasks ?? []}
          loading={lists.isLoading && !lists.data}
        />
        <WaitingConversations
          items={lists.data?.waitingConversations ?? lists.data?.unread ?? []}
          loading={lists.isLoading && !lists.data}
        />
      </div>

      <TeamPerformance
        items={charts.data?.performanceByOwner ?? []}
        loading={charts.isLoading && !charts.data}
        visible={canSeeTeam}
      />

      <JourneySummaryCards
        journeys={lists.data?.journeys}
        loading={lists.isLoading && !lists.data}
      />
    </div>
  );
}
