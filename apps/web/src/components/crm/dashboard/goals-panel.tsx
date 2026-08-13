"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, Pencil, Plus, Target } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { AnalyticsChart, useReducedMotion } from "./analytics-charts";
import { dashboardApi, type DashboardGoalAnalytics } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/empty-state";

const metricLabels: Record<string, string> = {
  REVENUE: "Receita",
  ORDERS: "Pedidos",
  NEW_CUSTOMERS: "Clientes novos",
  REPEAT_CUSTOMERS: "Clientes recorrentes",
};
const scopeLabels: Record<string, string> = {
  ORGANIZATION: "Organização",
  TEAM: "Equipe",
  USER: "Individual",
};
const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

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
  const goals = data?.goals ?? [];
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
  const selected = goals.find((goal) => goal.metric === metric) ?? goals[0];
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
          <p className="text-sm text-muted-foreground">Estamos chegando onde planejamos?</p>
        </div>
        {canManage ? (
          <Button onClick={() => beginEdit()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova meta
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(metricLabels).map(([value, label]) => (
          <Button
            key={value}
            variant={metric === value ? "default" : "outline"}
            size="sm"
            onClick={() => setMetric(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {!selected ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta configurada para o período"
          description="Os resultados permanecem disponíveis sem inventar metas históricas."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Realizado", value: selected.actual },
              { label: "Meta", value: selected.target },
              { label: "Progresso", value: selected.progressPct, suffix: "%" },
              {
                label: selected.exceeded > 0 ? "Superado" : "Falta",
                value: selected.exceeded > 0 ? selected.exceeded : selected.remaining,
              },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {format(selected, Number(item.value))}
                    {item.suffix}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-5">
              <div className="mb-2 flex justify-between text-sm">
                <span>
                  {scopeLabels[selected.scope]} ·{" "}
                  {selected.user?.name ?? selected.team?.name ?? "Toda a organização"}
                </span>
                <span>
                  {selected.pace === "AHEAD"
                    ? "Acima do ritmo"
                    : selected.pace === "ON_TRACK"
                      ? "No ritmo"
                      : "Abaixo do ritmo"}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none"
                  style={{
                    width: `${Math.min(100, selected.progressPct)}%`,
                    transitionDuration: reduced ? "0ms" : "700ms",
                  }}
                />
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <span>{selected.daysElapsed} dias decorridos</span>
                <span>{selected.daysRemaining} dias restantes</span>
                <span>Esperado: {format(selected, selected.expectedToDate)}</span>
                <span>
                  Necessário/dia:{" "}
                  {selected.requiredPerDay == null
                    ? "—"
                    : format(selected, selected.requiredPerDay)}
                </span>
              </div>
            </CardContent>
          </Card>
          <AnalyticsChart
            title="Meta × realizado"
            kind="line"
            data={(selected.curve ?? []).map((row: Record<string, unknown>) => ({
              ...row,
              label: String(row.date).slice(5),
            }))}
            dataKey="actual"
            secondaryKey="expected"
            valueFormatter={(value) => format(selected, value)}
          />
        </>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atingimento por meta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {goals.length ? (
            [...goals]
              .sort((a, b) => b.progressPct - a.progressPct)
              .map((goal, index) => (
                <div
                  key={goal.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                >
                  <span className="w-7 text-sm font-semibold">{index + 1}º</span>
                  <div className="min-w-[180px] flex-1">
                    <p className="font-medium">
                      {goal.user?.name ?? goal.team?.name ?? "Organização"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {metricLabels[goal.metric]} · {goal.progressPct}% ·{" "}
                      {format(goal, goal.actual)} / {format(goal, goal.target)}
                    </p>
                  </div>
                  {canManage ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Editar meta"
                        onClick={() => beginEdit(goal)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Arquivar meta"
                        onClick={() => archive.mutate(String(goal.id))}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
              ))
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>
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
              <Label>Fim exclusivo</Label>
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
