"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, ChevronDown, Pencil, Plus, Search, Target } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { AnalyticsChart, useReducedMotion } from "./analytics-charts";
import { dashboardApi, type DashboardGoalAnalytics } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

const metricLabels: Record<string, string> = {
  REVENUE: "Receita",
  ORDERS: "Pedidos",
  NEW_CUSTOMERS: "Clientes novos",
  REPEAT_CUSTOMERS: "Clientes recorrentes",
};
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const demoGoal: DashboardGoalAnalytics = {
  id: "demo-goal",
  metric: "REVENUE",
  scope: "ORGANIZATION",
  targetValue: 50000,
  target: 50000,
  actual: 32650,
  progressPct: 65,
  remaining: 17350,
  exceeded: 0,
  expectedToDate: 30000,
  requiredPerDay: 1735,
  daysElapsed: 20,
  daysRemaining: 10,
  pace: "AHEAD",
  periodStart: "2026-09-01T00:00:00.000Z",
  periodEnd: "2026-10-01T00:00:00.000Z",
  curve: [
    { date: "2026-09-01", actual: 1800, expected: 1500 },
    { date: "2026-09-05", actual: 7200, expected: 7500 },
    { date: "2026-09-10", actual: 15800, expected: 15000 },
    { date: "2026-09-15", actual: 24700, expected: 22500 },
    { date: "2026-09-20", actual: 32650, expected: 30000 },
  ],
};

export function GoalsPanel({
  data,
  options,
}: {
  data?: { goals: DashboardGoalAnalytics[] };
  options?: {
    teams: Array<{ id: string; name: string }>;
    users: Array<{ id: string; name: string; teamId?: string | null }>;
    pipelines: Array<{ id: string; name: string }>;
  };
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const reduced = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DashboardGoalAnalytics | null>(null);
  const [metric, setMetric] = React.useState("REVENUE");
  const [scope, setScope] = React.useState("ORGANIZATION");
  const [showExample, setShowExample] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState("ACTIVE");
  const [search, setSearch] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const realGoals = data?.goals ?? [];
  const goals = realGoals.length ? realGoals : showExample ? [demoGoal] : [];
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";
  const invalidate = () => client.invalidateQueries({ queryKey: ["dashboard", "goals"] });
  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editing
        ? dashboardApi.updateGoal(String(editing.id), payload)
        : dashboardApi.createGoal(payload),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setEditing(null);
    },
  });
  const archive = useMutation({ mutationFn: dashboardApi.archiveGoal, onSuccess: invalidate });
  const today = new Date();
  const goalStatus = (goal: DashboardGoalAnalytics) =>
    new Date(goal.periodStart) > today
      ? "FUTURE"
      : new Date(goal.periodEnd) <= today
        ? "COMPLETED"
        : "ACTIVE";
  const visibleGoals = goals.filter((goal) => {
    const owner = goal.user?.name ?? goal.team?.name ?? "Organização";
    return (
      goalStatus(goal) === statusFilter &&
      `${metricLabels[goal.metric]} ${owner}`.toLowerCase().includes(search.toLowerCase())
    );
  });
  const format = (goal: DashboardGoalAnalytics, value: number) =>
    goal.metric === "REVENUE"
      ? money(value)
      : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);

  const beginEdit = (goal?: DashboardGoalAnalytics) => {
    setEditing(goal ?? null);
    setMetric(goal?.metric ?? "REVENUE");
    setScope(goal?.scope ?? (user?.role === "MANAGER" ? "TEAM" : "ORGANIZATION"));
    setOpen(true);
  };
  return (
    <div className="space-y-5" data-testid="dashboard-goals">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Metas</h2>
          <p className="text-sm text-muted-foreground">Acompanhe o planejado, o realizado e o ritmo da operação.</p>
        </div>
        {canManage ? (
          <Button onClick={() => beginEdit()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova meta
          </Button>
        ) : null}
      </div>
      {showExample && !realGoals.length ? (
        <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50/55 px-4 py-3">
          <div><p className="text-sm font-semibold text-violet-900">Exemplo de visualização</p><p className="text-xs text-violet-700">Os valores abaixo são fictícios e não alteram seus dados.</p></div>
          <Button size="sm" variant="outline" onClick={() => setShowExample(false)}>Fechar exemplo</Button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(metricLabels).map(([metricKey, label]) => {
          const metricGoals = goals.filter((goal) => goal.metric === metricKey && goalStatus(goal) === "ACTIVE");
          const actual = metricGoals.reduce((total, goal) => total + goal.actual, 0);
          const target = metricGoals.reduce((total, goal) => total + goal.target, 0);
          const progress = target > 0 ? Math.round((actual / target) * 100) : 0;
          const formatter = metricKey === "REVENUE" ? money : (value: number) => new Intl.NumberFormat("pt-BR").format(value);
          return (
            <Card key={metricKey} className={cn("min-h-36", !metricGoals.length && "border-dashed bg-card/55")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between"><p className="text-sm font-semibold">{label}</p><Target className="h-4 w-4 text-primary" /></div>
                {metricGoals.length ? <><p className="mt-3 text-xl font-semibold">{formatter(actual)} <span className="text-sm font-normal text-muted-foreground">de {formatter(target)}</span></p><div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", progress >= 100 ? "bg-emerald-500" : progress >= 70 ? "bg-primary" : "bg-amber-500")} style={{ width: `${Math.min(100, progress)}%`, transitionDuration: reduced ? "0ms" : "500ms" }} /></div><div className="mt-2 flex justify-between text-xs"><strong>{progress}% concluído</strong><span className="text-muted-foreground">Faltam {formatter(Math.max(0, target - actual))}</span></div></> : <><p className="mt-3 text-sm text-muted-foreground">Nenhuma meta ativa</p>{canManage ? <button type="button" className="mt-3 text-xs font-semibold text-primary hover:underline" onClick={() => { beginEdit(); setMetric(metricKey); }}>+ Criar meta</button> : null}</>}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!goals.length ? <Card className="border-dashed"><CardContent className="flex flex-col items-center px-6 py-9 text-center"><Target className="h-6 w-6 text-primary" /><h3 className="mt-2 text-sm font-semibold">Nenhuma meta configurada</h3><p className="mt-1 max-w-md text-sm text-muted-foreground">Crie uma meta ou veja um exemplo de como o acompanhamento será apresentado.</p><div className="mt-4 flex gap-2">{canManage ? <Button size="sm" onClick={() => beginEdit()}>Criar primeira meta</Button> : null}<Button size="sm" variant="outline" onClick={() => setShowExample(true)}>Ver exemplo</Button></div></CardContent></Card> : null}
      {goals.length ? <Card className="overflow-hidden"><CardHeader className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base">Todas as metas</CardTitle><p className="mt-1 text-xs text-muted-foreground">Clique em uma meta para abrir evolução e projeções.</p></div><div className="relative w-full sm:w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar meta..." className="pl-9" /></div></div><div className="flex gap-2">{([ ["ACTIVE","Ativas"], ["FUTURE","Futuras"], ["COMPLETED","Concluídas"] ] as const).map(([value,label]) => <Button key={value} size="sm" variant={statusFilter === value ? "default" : "outline"} onClick={() => setStatusFilter(value)}>{label}</Button>)}</div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-sm"><thead className="border-y bg-muted/35 text-xs text-muted-foreground"><tr><th className="px-5 py-3 text-left">Meta</th><th className="px-4 py-3 text-left">Escopo</th><th className="px-4 py-3 text-right">Realizado</th><th className="px-4 py-3 text-right">Objetivo</th><th className="px-4 py-3 text-left">Progresso</th><th className="px-4 py-3 text-right">Falta</th><th className="px-4 py-3 text-right">Prazo</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody>{visibleGoals.map((goal) => <React.Fragment key={goal.id}><tr className="cursor-pointer border-b hover:bg-muted/20" onClick={() => setExpandedId(expandedId === goal.id ? null : goal.id)}><td className="px-5 py-3 font-semibold">{metricLabels[goal.metric]}</td><td className="px-4 py-3 text-muted-foreground">{goal.user?.name ?? goal.team?.name ?? "Organização"}</td><td className="px-4 py-3 text-right">{format(goal, goal.actual)}</td><td className="px-4 py-3 text-right">{format(goal, goal.target)}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className={goal.progressPct >= 100 ? "h-full bg-emerald-500" : goal.pace === "BEHIND" ? "h-full bg-amber-500" : "h-full bg-primary"} style={{ width: `${Math.min(100, goal.progressPct)}%` }} /></div><strong className="text-xs">{goal.progressPct}%</strong></div></td><td className="px-4 py-3 text-right">{format(goal, Math.max(0, goal.remaining))}</td><td className="px-4 py-3 text-right text-muted-foreground">{goal.daysRemaining > 0 ? `${goal.daysRemaining} dias` : "Encerrada"}</td><td className="px-4 py-3 text-right"><div className="flex justify-end" onClick={(event) => event.stopPropagation()}>{canManage && goal.id !== "demo-goal" ? <><Button size="icon" variant="ghost" aria-label="Editar meta" onClick={() => beginEdit(goal)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Arquivar meta" onClick={() => archive.mutate(String(goal.id))}><Archive className="h-4 w-4" /></Button></> : null}<ChevronDown className={cn("m-2 h-4 w-4 transition-transform", expandedId === goal.id && "rotate-180")} /></div></td></tr>{expandedId === goal.id ? <tr className="border-b bg-muted/10"><td colSpan={8} className="p-4"><div className="grid gap-3 lg:grid-cols-[1fr_1.7fr]"><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg border bg-card p-3"><span className="text-xs text-muted-foreground">Situação</span><p className={cn("mt-1 font-semibold", goal.pace === "BEHIND" ? "text-amber-600" : "text-emerald-600")}>{goal.pace === "AHEAD" ? "Acima do ritmo" : goal.pace === "ON_TRACK" ? "No ritmo" : "Atenção"}</p></div><div className="rounded-lg border bg-card p-3"><span className="text-xs text-muted-foreground">Necessário por dia</span><p className="mt-1 font-semibold">{goal.requiredPerDay == null ? "—" : format(goal, goal.requiredPerDay)}</p></div><div className="rounded-lg border bg-card p-3"><span className="text-xs text-muted-foreground">Esperado até hoje</span><p className="mt-1 font-semibold">{format(goal, goal.expectedToDate)}</p></div><div className="rounded-lg border bg-card p-3"><span className="text-xs text-muted-foreground">Período</span><p className="mt-1 font-semibold">{goal.daysElapsed} de {goal.daysElapsed + goal.daysRemaining} dias</p></div></div><AnalyticsChart title="Realizado × esperado" kind="line" data={(goal.curve ?? []).map((row) => ({ ...row, label: String(row.date).slice(5) }))} dataKey="actual" secondaryKey="expected" valueFormatter={(value) => format(goal, value)} /></div></td></tr> : null}</React.Fragment>)}</tbody></table>{!visibleGoals.length ? <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma meta encontrada com estes filtros.</p> : null}</div></CardContent></Card> : null}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Editar meta" : "Nova meta"}
        description="Defina um alvo histórico sem alterar períodos anteriores."
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            save.mutate({
              metric,
              scope,
              targetValue: form.get("targetValue"),
              periodStart: `${form.get("periodStart")}T00:00:00.000Z`,
              periodEnd: `${form.get("periodEnd")}T00:00:00.000Z`,
              teamId: scope === "TEAM" ? form.get("teamId") : undefined,
              userId: scope === "USER" ? form.get("userId") : undefined,
              pipelineId: form.get("pipelineId") || undefined,
            });
          }}
        >
          <div>
            <Label>Métrica</Label>
            <Select value={metric} onChange={(e) => setMetric(e.target.value)}>
              {Object.entries(metricLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Escopo</Label>
            <Select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="ORGANIZATION">Organização</option>
              <option value="TEAM">Equipe</option>
              <option value="USER">Individual</option>
            </Select>
          </div>
          {scope === "TEAM" ? (
            <div>
              <Label>Equipe</Label>
              <Select name="teamId" defaultValue={editing?.teamId ?? options?.teams[0]?.id}>
                {options?.teams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {scope === "USER" ? (
            <div>
              <Label>Pessoa</Label>
              <Select name="userId" defaultValue={editing?.userId ?? options?.users[0]?.id}>
                {options?.users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div>
            <Label>Pipeline (opcional)</Label>
            <Select name="pipelineId" defaultValue={editing?.pipelineId ?? ""}>
              <option value="">Todos acessíveis</option>
              {options?.pipelines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Valor alvo</Label>
            <Input
              name="targetValue"
              inputMode="decimal"
              defaultValue={editing?.targetValue ?? ""}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input
                name="periodStart"
                type="date"
                defaultValue={editing?.periodStart?.slice(0, 10)}
                required
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                name="periodEnd"
                type="date"
                defaultValue={editing?.periodEnd?.slice(0, 10)}
                required
              />
            </div>
          </div>
          {save.error ? (
            <p className="text-sm text-destructive">{(save.error as Error).message}</p>
          ) : null}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Salvando…" : "Salvar meta"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
