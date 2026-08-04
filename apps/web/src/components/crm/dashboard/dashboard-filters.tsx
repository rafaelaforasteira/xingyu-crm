"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/form-controls";

export type DashboardFilterState = {
  period: string;
  from: string;
  to: string;
  pipelineId: string;
  ownerId: string;
  channel: string;
  scope: "me" | "team" | "company";
};

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilterState = {
  period: "30d",
  from: "",
  to: "",
  pipelineId: "",
  ownerId: "",
  channel: "",
  scope: "company",
};

const filterFieldClass =
  "flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground";

export function DashboardFilters({
  value,
  onChange,
  pipelines,
  users,
  channels,
  canSeeTeam,
}: {
  value: DashboardFilterState;
  onChange: (next: DashboardFilterState) => void;
  pipelines: { id: string; name: string }[];
  users: { id: string; name: string }[];
  channels: string[];
  canSeeTeam: boolean;
  /** @deprecated kept optional for call-site compatibility */
  scopeLabel?: string;
}) {
  const customInvalid =
    value.period === "custom" &&
    Boolean(value.from && value.to && value.from > value.to);

  const hasActiveFilters =
    value.period !== "30d" ||
    value.pipelineId ||
    value.ownerId ||
    value.channel ||
    value.from ||
    value.to;

  return (
    <section className="rounded-xl border border-border bg-card px-3 py-3 shadow-soft sm:px-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <label className={filterFieldClass}>
          Período
          <Select
            value={value.period}
            onChange={(e) =>
              onChange({
                ...value,
                period: e.target.value,
                ...(e.target.value !== "custom" ? { from: "", to: "" } : {}),
              })
            }
            aria-label="Filtrar por período"
          >
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="month">Mês atual</option>
            <option value="custom">Período personalizado</option>
          </Select>
        </label>

        {value.period === "custom" ? (
          <>
            <label className={filterFieldClass}>
              De
              <Input
                type="date"
                value={value.from}
                max={value.to || undefined}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
                aria-label="Data inicial"
              />
            </label>
            <label className={filterFieldClass}>
              Até
              <Input
                type="date"
                value={value.to}
                min={value.from || undefined}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
                aria-label="Data final"
              />
            </label>
          </>
        ) : null}

        <label className={filterFieldClass}>
          Pipeline
          <Select
            value={value.pipelineId}
            onChange={(e) => onChange({ ...value, pipelineId: e.target.value })}
            aria-label="Filtrar por pipeline"
          >
            <option value="">Todos os pipelines</option>
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </Select>
        </label>

        <label className={filterFieldClass}>
          Responsável
          <Select
            value={value.ownerId}
            onChange={(e) => onChange({ ...value, ownerId: e.target.value })}
            aria-label="Filtrar por responsável"
            disabled={!canSeeTeam && Boolean(value.ownerId)}
          >
            <option value="">{canSeeTeam ? "Toda a equipe" : "Eu"}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </label>

        {channels.length > 0 ? (
          <label className={filterFieldClass}>
            Canal
            <Select
              value={value.channel}
              onChange={(e) => onChange({ ...value, channel: e.target.value })}
              aria-label="Filtrar por canal"
            >
              <option value="">Todos os canais</option>
              {channels.map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>

      {customInvalid ? (
        <p className="mt-2 text-xs text-destructive">
          A data inicial não pode ser posterior à data final.
        </p>
      ) : value.period === "custom" && (!value.from || !value.to) ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Selecione as duas datas para aplicar o período personalizado.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
        {canSeeTeam ? (
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Escopo da operação"
          >
            {(
              [
                ["me", "Minha operação"],
                ["team", "Minha equipe"],
                ["company", "Empresa inteira"],
              ] as const
            ).map(([scope, label]) => (
              <button
                key={scope}
                type="button"
                onClick={() => onChange({ ...value, scope })}
                className={
                  value.scope === scope
                    ? "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                    : "rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                }
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() =>
              onChange({
                ...DEFAULT_DASHBOARD_FILTERS,
                scope: value.scope,
                ownerId: value.scope === "me" ? value.ownerId : "",
              })
            }
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </section>
  );
}
