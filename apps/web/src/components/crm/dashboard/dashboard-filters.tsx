"use client";

import { CalendarDays, CalendarRange, Kanban, Radio, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/filter-select";

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

const filterFieldClass = "flex min-w-0 flex-col gap-1.5 text-xs font-medium text-foreground/80";

const periodOptions = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "custom", label: "Período personalizado" },
];

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
    value.period === "custom" && Boolean(value.from && value.to && value.from > value.to);

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
        <FilterSelect
          label="Período"
          icon={CalendarDays}
          options={periodOptions}
            value={value.period}
            onChange={(period) =>
              onChange({
                ...value,
                period,
                ...(period !== "custom" ? { from: "", to: "" } : {}),
              })
            }
            aria-label="Filtrar por período"
        />

        {value.period === "custom" ? (
          <>
            <label className={filterFieldClass}>
              <span className="flex items-center gap-1.5"><CalendarRange className="h-3.5 w-3.5 text-primary" />De</span>
              <Input
                type="date"
                value={value.from}
                max={value.to || undefined}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
                aria-label="Data inicial"
              />
            </label>
            <label className={filterFieldClass}>
              <span className="flex items-center gap-1.5"><CalendarRange className="h-3.5 w-3.5 text-primary" />Até</span>
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

        <FilterSelect
          label="Pipeline"
          icon={Kanban}
          options={[
            { value: "", label: "Todos os pipelines" },
            ...pipelines.map((pipeline) => ({ value: pipeline.id, label: pipeline.name })),
          ]}
            value={value.pipelineId}
            onChange={(pipelineId) => onChange({ ...value, pipelineId })}
            aria-label="Filtrar por pipeline"
        />

        <FilterSelect
          label="Responsável"
          icon={UserRound}
          options={[
            { value: "", label: canSeeTeam ? "Toda a equipe" : "Eu" },
            ...users.map((user) => ({ value: user.id, label: user.name })),
          ]}
            value={value.ownerId}
            onChange={(ownerId) => onChange({ ...value, ownerId })}
            aria-label="Filtrar por responsável"
            disabled={!canSeeTeam && Boolean(value.ownerId)}
        />

        {channels.length > 0 ? (
          <FilterSelect
            label="Canal"
            icon={Radio}
            options={[
              { value: "", label: "Todos os canais" },
              ...channels.map((channel) => ({ value: channel, label: channel })),
            ]}
              value={value.channel}
              onChange={(channel) => onChange({ ...value, channel })}
              aria-label="Filtrar por canal"
          />
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
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Escopo da operação">
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
