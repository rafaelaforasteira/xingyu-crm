"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { marketingApi, reportsApi, settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/utils";
import { SETTINGS_NAV } from "@/lib/nav";
import { PageHeader, MetricCard, ErrorBanner } from "@/components/crm/page-header";
import { SimpleBarChart, SimpleLineChart } from "@/components/crm/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-controls";
import { Megaphone, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MarketingPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.marketing,
    queryFn: () => marketingApi.overview(),
    retry: false,
  });

  return (
    <div>
      <PageHeader title="Marketing" description="Campanhas, alcance e conversões." />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? <Skeleton className="mb-4 h-28 w-full" /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleLineChart title="Alcance" data={data?.charts.reach ?? []} />
        <SimpleBarChart title="Conversões" data={data?.charts.conversions ?? []} />
      </div>
      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Campanha</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Investimento</th>
              <th className="px-4 py-3 text-left font-medium">Leads</th>
            </tr>
          </thead>
          <tbody>
            {(data?.campaigns ?? []).length === 0 && !isLoading ? (
              <tr>
                <td colSpan={4} className="p-4">
                  <EmptyState icon={Megaphone} title="Sem campanhas" />
                </td>
              </tr>
            ) : null}
            {data?.campaigns?.map((c) => (
              <tr key={c.id} className="border-b border-border/60">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{c.status}</Badge>
                </td>
                <td className="px-4 py-3">{formatCurrency(c.spend)}</td>
                <td className="px-4 py-3">{c.leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => reportsApi.overview(),
    retry: false,
  });

  return (
    <div>
      <PageHeader title="Relatórios" description="Performance comercial e funil." />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? <Skeleton className="mb-4 h-24 w-full" /> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(data?.kpis ?? []).map((kpi) => (
          <MetricCard
            key={kpi.label}
            label={kpi.label}
            value={
              kpi.label.toLowerCase().includes("receita") ||
              kpi.label.toLowerCase().includes("ticket")
                ? formatCurrency(kpi.value)
                : kpi.value
            }
            hint={kpi.change != null ? `${kpi.change > 0 ? "+" : ""}${kpi.change}%` : undefined}
          />
        ))}
        {!isLoading && (data?.kpis?.length ?? 0) === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Sem KPIs"
            description="Aguarde dados da API de relatórios."
            className="sm:col-span-2 xl:col-span-4"
          />
        ) : null}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <SimpleLineChart title="Vendas" data={data?.charts.sales ?? []} />
        <SimpleBarChart title="Funil" data={data?.charts.funnel ?? []} />
        <SimpleBarChart title="Por responsável" data={data?.charts.owners ?? []} />
      </div>
    </div>
  );
}

export function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="h-fit rounded-xl border border-border bg-card p-2 shadow-card">
        <p className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Configurações
        </p>
        <nav className="space-y-0.5">
          {SETTINGS_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-2.5 py-2 text-sm font-medium",
                pathname === item.href
                  ? "bg-accent text-primary"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}

export function SettingsGeneralPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.overview(),
    retry: false,
  });

  return (
    <SettingsLayout>
      <PageHeader title="Geral" description="Organização e preferências." />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      <Card>
        <CardContent className="grid gap-4 py-5 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Organização</Label>
            <Input readOnly value={data?.organizationName ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Fuso horário</Label>
            <Input readOnly value={data?.timezone ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Moeda</Label>
            <Input readOnly value={data?.currency ?? ""} />
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
}

export function SettingsListPage({
  title,
  description,
  kind,
}: {
  title: string;
  description: string;
  kind: "teams" | "users" | "channels" | "integrations" | "pipelines" | "notifications";
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => settingsApi.overview(),
    retry: false,
  });

  const items =
    kind === "teams"
      ? (data?.teams ?? []).map((t) => ({ id: t.id, title: t.name, meta: "Equipe" }))
      : kind === "users"
        ? (data?.users ?? []).map((u) => ({
            id: u.id,
            title: u.name,
            meta: u.role ?? u.team ?? "Usuário",
          }))
        : kind === "channels"
          ? (data?.channels ?? []).map((c) => ({
              id: c.id,
              title: c.name,
              meta: c.status,
            }))
          : kind === "integrations"
            ? (data?.integrations ?? []).map((i) => ({
                id: i.id,
                title: i.name,
                meta: i.connected ? "Conectado" : "Desconectado",
              }))
            : [];

  return (
    <SettingsLayout>
      <PageHeader title={title} description={description} />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      {isLoading ? <Skeleton className="h-32 w-full" /> : null}
      {kind === "pipelines" ? (
        <Card>
          <CardHeader>
            <CardTitle>Pipelines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Gerencie estágios e funis em{" "}
              <Link href="/pipelines" className="text-primary hover:underline">
                Pipelines
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : kind === "notifications" ? (
        <Card>
          <CardContent className="space-y-3 py-5 text-sm">
            <p>Preferências de notificação são carregadas da API quando disponíveis.</p>
            <p className="text-muted-foreground">
              Demo: alertas de tarefas, inbox e pós-venda habilitados.
            </p>
          </CardContent>
        </Card>
      ) : items.length === 0 && !isLoading ? (
        <EmptyState title={`Sem ${title.toLowerCase()}`} />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="font-medium">{item.title}</span>
              <Badge variant="secondary">{item.meta}</Badge>
            </div>
          ))}
        </div>
      )}
    </SettingsLayout>
  );
}
