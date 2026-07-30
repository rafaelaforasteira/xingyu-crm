"use client";

import * as React from "react";
import Link from "next/link";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Briefcase,
  Headphones,
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  occurrencesApi,
  reactivationApi,
  repurchaseApi,
  settingsApi,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/utils";
import type {
  ReactivationLead,
  ReactivationFilterStatus,
  ReactivationListQuery,
  ReactivationSegment,
  ReactivationSortBy,
  ReactivationStatus,
} from "@/lib/types";
import { PageHeader, PaginationBar, ErrorBanner } from "@/components/crm/page-header";
import { CreateOpportunityDialog } from "@/components/crm/create-opportunity-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { EmptyState } from "@/components/ui/empty-state";
import { Label, Select } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

function ScoreBadge({ score }: { score: number }) {
  const variant =
    score >= 80 ? "success" : score >= 50 ? "warning" : "secondary";
  return <Badge variant={variant}>{score}</Badge>;
}

export function RepurchasePage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.repurchase({ page }),
    queryFn: () => repurchaseApi.list({ page, pageSize: 20 }),
    retry: false,
  });

  return (
    <div>
      <PageHeader
        title="Recompra"
        description="Contatos com alto potencial de novo pedido."
      />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      <ScoreTable
        loading={isLoading}
        emptyIcon={RefreshCw}
        emptyTitle="Nenhuma oportunidade de recompra"
        rows={(data?.data ?? [])
          .filter((r) => r.contact?.id)
          .map((r) => ({
          id: r.id,
          href: `/contacts/${r.contact.id}`,
          name: r.contact.name || "Contato",
          score: r.score,
          meta: r.reason || `${r.daysSinceOrder ?? "—"} dias desde o pedido`,
          extra: r.predictedValue != null ? formatCurrency(r.predictedValue) : undefined,
          status: r.status,
        }))}
      />
      {data?.meta ? (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

interface ReactivationFilters {
  search: string;
  scoreMin: string;
  scoreMax: string;
  inactiveDaysMin: string;
  inactiveDaysMax: string;
  status: "" | ReactivationFilterStatus;
  ownerId: string;
  teamId: string;
  lastPurchaseFrom: string;
  lastPurchaseTo: string;
  lastInteractionFrom: string;
  lastInteractionTo: string;
  segment: "" | ReactivationSegment;
  sortBy: ReactivationSortBy;
  sortOrder: "asc" | "desc";
}

const DEFAULT_REACTIVATION_FILTERS: ReactivationFilters = {
  search: "",
  scoreMin: "",
  scoreMax: "",
  inactiveDaysMin: "",
  inactiveDaysMax: "",
  status: "",
  ownerId: "",
  teamId: "",
  lastPurchaseFrom: "",
  lastPurchaseTo: "",
  lastInteractionFrom: "",
  lastInteractionTo: "",
  segment: "",
  sortBy: "score",
  sortOrder: "desc",
};

const STATUS_LABELS: Record<ReactivationStatus, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualificado",
  ACTIVE_CUSTOMER: "Cliente ativo",
  INACTIVE: "Inativo",
  ARCHIVED: "Arquivado",
};

const FILTER_STATUS_OPTIONS: ReactivationFilterStatus[] = [
  "LEAD",
  "QUALIFIED",
  "ACTIVE_CUSTOMER",
  "INACTIVE",
];

const SEGMENT_LABELS: Record<ReactivationSegment, string> = {
  lead_nunca_comprou: "Lead que nunca comprou",
  comprou_uma_vez: "Comprou uma vez",
  recorrente_parou: "Cliente recorrente que parou",
  cliente_sem_resposta: "Cliente sem resposta",
};

const SORT_LABELS: Record<ReactivationSortBy, string> = {
  score: "Score",
  daysInactive: "Dias inativo",
  lastPurchaseAt: "Última compra",
  lastInteractionAt: "Última interação",
  name: "Nome",
};

function optionalInteger(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function dateBoundary(value: string, endOfDay = false) {
  if (!value) return undefined;
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
}

function reactivationFilterError(filters: ReactivationFilters) {
  const numericFilters = [
    {
      value: filters.scoreMin,
      label: "Score mínimo",
      minimum: 0,
      maximum: 100,
    },
    {
      value: filters.scoreMax,
      label: "Score máximo",
      minimum: 0,
      maximum: 100,
    },
    {
      value: filters.inactiveDaysMin,
      label: "Dias inativos mínimo",
      minimum: 0,
    },
    {
      value: filters.inactiveDaysMax,
      label: "Dias inativos máximo",
      minimum: 0,
    },
  ];
  for (const numericFilter of numericFilters) {
    if (!numericFilter.value.trim()) continue;
    const value = Number(numericFilter.value);
    if (!Number.isInteger(value)) {
      return `${numericFilter.label} deve ser um número inteiro.`;
    }
    if (value < numericFilter.minimum) {
      return `${numericFilter.label} deve ser maior ou igual a ${numericFilter.minimum}.`;
    }
    if (
      numericFilter.maximum !== undefined &&
      value > numericFilter.maximum
    ) {
      return `${numericFilter.label} deve ser menor ou igual a ${numericFilter.maximum}.`;
    }
  }

  const scoreMin = optionalInteger(filters.scoreMin);
  const scoreMax = optionalInteger(filters.scoreMax);
  if (
    scoreMin !== undefined &&
    scoreMax !== undefined &&
    scoreMin > scoreMax
  ) {
    return "O score mínimo não pode ser maior que o score máximo.";
  }

  const inactiveMin = optionalInteger(filters.inactiveDaysMin);
  const inactiveMax = optionalInteger(filters.inactiveDaysMax);
  if (
    inactiveMin !== undefined &&
    inactiveMax !== undefined &&
    inactiveMin > inactiveMax
  ) {
    return "O mínimo de dias inativos não pode ser maior que o máximo.";
  }
  if (
    filters.lastPurchaseFrom &&
    filters.lastPurchaseTo &&
    filters.lastPurchaseFrom > filters.lastPurchaseTo
  ) {
    return "A data inicial da última compra não pode ser posterior à data final.";
  }
  if (
    filters.lastInteractionFrom &&
    filters.lastInteractionTo &&
    filters.lastInteractionFrom > filters.lastInteractionTo
  ) {
    return "A data inicial da última interação não pode ser posterior à data final.";
  }
  return null;
}

export function ReactivationPage() {
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState<ReactivationFilters>(
    DEFAULT_REACTIVATION_FILTERS,
  );
  const deferredSearch = React.useDeferredValue(filters.search.trim());
  const filterError = reactivationFilterError(filters);

  const query = React.useMemo<ReactivationListQuery>(
    () => ({
      page,
      pageSize: 20,
      search: deferredSearch || undefined,
      scoreMin: optionalInteger(filters.scoreMin),
      scoreMax: optionalInteger(filters.scoreMax),
      inactiveDaysMin: optionalInteger(filters.inactiveDaysMin),
      inactiveDaysMax: optionalInteger(filters.inactiveDaysMax),
      status: filters.status || undefined,
      ownerId: filters.ownerId || undefined,
      teamId: filters.teamId || undefined,
      lastPurchaseFrom: dateBoundary(filters.lastPurchaseFrom),
      lastPurchaseTo: dateBoundary(filters.lastPurchaseTo, true),
      lastInteractionFrom: dateBoundary(filters.lastInteractionFrom),
      lastInteractionTo: dateBoundary(filters.lastInteractionTo, true),
      segment: filters.segment || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    }),
    [deferredSearch, filters, page],
  );

  const list = useQuery({
    queryKey: queryKeys.reactivation(query),
    queryFn: () => reactivationApi.list(query),
    placeholderData: keepPreviousData,
    retry: false,
    enabled: !filterError,
  });
  const owners = useQuery({
    queryKey: [...queryKeys.settings, "reactivation-owners"],
    queryFn: () => settingsApi.users(),
    retry: false,
  });
  const teams = useQuery({
    queryKey: [...queryKeys.settings, "reactivation-teams"],
    queryFn: () => settingsApi.teams(),
    retry: false,
  });

  const updateFilter = <Key extends keyof ReactivationFilters>(
    key: Key,
    value: ReactivationFilters[Key],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(filters.search.trim()) ||
    Boolean(filters.scoreMin) ||
    Boolean(filters.scoreMax) ||
    Boolean(filters.inactiveDaysMin) ||
    Boolean(filters.inactiveDaysMax) ||
    Boolean(filters.status) ||
    Boolean(filters.ownerId) ||
    Boolean(filters.teamId) ||
    Boolean(filters.lastPurchaseFrom) ||
    Boolean(filters.lastPurchaseTo) ||
    Boolean(filters.lastInteractionFrom) ||
    Boolean(filters.lastInteractionTo) ||
    Boolean(filters.segment) ||
    filters.sortBy !== "score" ||
    filters.sortOrder !== "desc";

  const errorMessage =
    filterError ??
    (list.error instanceof Error ? list.error.message : null) ??
    (owners.error instanceof Error ? owners.error.message : null) ??
    (teams.error instanceof Error ? teams.error.message : null);

  return (
    <div>
      <PageHeader
        title="Reativação"
        description="Base fria e contatos inativos priorizados por score."
      />

      <Card className="mb-5">
        <CardContent className="space-y-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Filtros de reativação</h2>
              <p className="text-xs text-muted-foreground">
                Refine a lista sem perder o resultado anterior durante a atualização.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {list.isFetching && !list.isPending ? (
                <span
                  role="status"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Atualizando…
                </span>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setFilters(DEFAULT_REACTIVATION_FILTERS);
                  setPage(1);
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </div>

          <div
            aria-label="Filtros de reativação"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="reactivation-search">Buscar</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reactivation-search"
                  type="search"
                  className="pl-9"
                  placeholder="Nome, e-mail ou telefone"
                  value={filters.search}
                  onChange={(event) =>
                    updateFilter("search", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reactivation-status">Status</Label>
              <Select
                id="reactivation-status"
                value={filters.status}
                onChange={(event) =>
                  updateFilter(
                    "status",
                    event.target.value as ReactivationFilters["status"],
                  )
                }
              >
                <option value="">Todos os status</option>
                {FILTER_STATUS_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reactivation-segment">Segmento</Label>
              <Select
                id="reactivation-segment"
                value={filters.segment}
                onChange={(event) =>
                  updateFilter(
                    "segment",
                    event.target.value as ReactivationFilters["segment"],
                  )
                }
              >
                <option value="">Todos os segmentos</option>
                {Object.entries(SEGMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reactivation-score-min">Score mínimo</Label>
              <Input
                id="reactivation-score-min"
                type="number"
                min="0"
                max="100"
                value={filters.scoreMin}
                onChange={(event) =>
                  updateFilter("scoreMin", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reactivation-score-max">Score máximo</Label>
              <Input
                id="reactivation-score-max"
                type="number"
                min="0"
                max="100"
                value={filters.scoreMax}
                onChange={(event) =>
                  updateFilter("scoreMax", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reactivation-days-min">
                Dias inativos mínimo
              </Label>
              <Input
                id="reactivation-days-min"
                type="number"
                min="0"
                value={filters.inactiveDaysMin}
                onChange={(event) =>
                  updateFilter("inactiveDaysMin", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reactivation-days-max">
                Dias inativos máximo
              </Label>
              <Input
                id="reactivation-days-max"
                type="number"
                min="0"
                value={filters.inactiveDaysMax}
                onChange={(event) =>
                  updateFilter("inactiveDaysMax", event.target.value)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reactivation-owner">Consultora</Label>
              <Select
                id="reactivation-owner"
                value={filters.ownerId}
                disabled={owners.isLoading}
                onChange={(event) =>
                  updateFilter("ownerId", event.target.value)
                }
              >
                <option value="">Todas as consultoras</option>
                {(owners.data ?? []).map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reactivation-team">Equipe</Label>
              <Select
                id="reactivation-team"
                value={filters.teamId}
                disabled={teams.isLoading}
                onChange={(event) =>
                  updateFilter("teamId", event.target.value)
                }
              >
                <option value="">Todas as equipes</option>
                {(teams.data ?? []).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reactivation-purchase-from">
                Última compra de
              </Label>
              <Input
                id="reactivation-purchase-from"
                type="date"
                value={filters.lastPurchaseFrom}
                onChange={(event) =>
                  updateFilter("lastPurchaseFrom", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reactivation-purchase-to">
                Última compra até
              </Label>
              <Input
                id="reactivation-purchase-to"
                type="date"
                value={filters.lastPurchaseTo}
                onChange={(event) =>
                  updateFilter("lastPurchaseTo", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reactivation-interaction-from">
                Última interação de
              </Label>
              <Input
                id="reactivation-interaction-from"
                type="date"
                value={filters.lastInteractionFrom}
                onChange={(event) =>
                  updateFilter("lastInteractionFrom", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reactivation-interaction-to">
                Última interação até
              </Label>
              <Input
                id="reactivation-interaction-to"
                type="date"
                value={filters.lastInteractionTo}
                onChange={(event) =>
                  updateFilter("lastInteractionTo", event.target.value)
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reactivation-sort">Ordenar por</Label>
              <Select
                id="reactivation-sort"
                value={filters.sortBy}
                onChange={(event) =>
                  updateFilter(
                    "sortBy",
                    event.target.value as ReactivationSortBy,
                  )
                }
              >
                {Object.entries(SORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reactivation-order">Ordem</Label>
              <Select
                id="reactivation-order"
                value={filters.sortOrder}
                onChange={(event) =>
                  updateFilter(
                    "sortOrder",
                    event.target.value as ReactivationFilters["sortOrder"],
                  )
                }
              >
                <option value="desc">Decrescente</option>
                <option value="asc">Crescente</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {filterError ? <ErrorBanner message={filterError} /> : null}
      {!filterError && errorMessage ? (
        <div className="mb-4">
          <ErrorBanner message={errorMessage} />
          <Button
            type="button"
            variant="outline"
            disabled={list.isFetching || owners.isFetching || teams.isFetching}
            onClick={() => {
              void Promise.all([
                list.refetch(),
                owners.refetch(),
                teams.refetch(),
              ]);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      ) : null}

      <ReactivationTable
        rows={list.data?.data ?? []}
        loading={list.isPending && !filterError}
        fetching={list.isFetching}
      />

      {list.data?.meta && !filterError ? (
        <div
          className={
            list.isPlaceholderData
              ? "pointer-events-none opacity-60"
              : undefined
          }
        >
          <div className="mt-3 text-right text-xs text-muted-foreground">
            {list.data.data.length} de {list.data.meta.total} oportunidades
          </div>
          <PaginationBar
            page={list.data.meta.page}
            totalPages={list.data.meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}

function ReactivationTable({
  rows,
  loading,
  fetching,
}: {
  rows: ReactivationLead[];
  loading: boolean;
  fetching: boolean;
}) {
  const [createTarget, setCreateTarget] = React.useState<{
    contactId: string;
    contactName: string;
    defaultOwnerId?: string | null;
  } | null>(null);

  return (
    <>
      <div
        aria-busy={fetching}
        className="overflow-x-auto rounded-xl border border-border bg-card shadow-card"
      >
        <table
          data-testid="reactivation-table"
          className="w-full min-w-[1100px] text-sm"
        >
          <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Contato</th>
              <th className="px-4 py-3 text-left font-medium">Score</th>
              <th className="px-4 py-3 text-left font-medium">Segmento</th>
              <th className="px-4 py-3 text-left font-medium">Inatividade</th>
              <th className="px-4 py-3 text-left font-medium">Consultora / equipe</th>
              <th className="px-4 py-3 text-left font-medium">Última interação</th>
              <th className="px-4 py-3 text-left font-medium">Última compra</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-b border-border/60">
                    <td colSpan={9} className="px-4 py-3">
                      <Skeleton className="h-10 w-full" />
                    </td>
                  </tr>
                ))
              : null}

            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4">
                  <EmptyState
                    icon={Sparkles}
                    title="Nenhuma oportunidade de reativação"
                    description="Ajuste os filtros ou aguarde novos contatos elegíveis."
                  />
                </td>
              </tr>
            ) : null}

            {!loading
              ? rows.map((row) => {
                  const contact = row.contact;
                  return (
                  <tr
                    key={row.id}
                    data-testid="reactivation-row"
                    data-reactivation-id={row.id}
                    className="border-b border-border/60 hover:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      {contact ? (
                        <div>
                          <Link
                            href={`/contacts/${contact.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {contact.name}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {contact.email ||
                              contact.phone ||
                              contact.whatsapp ||
                              "Sem contato direto"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {contact.orderCount} pedido(s) ·{" "}
                            {formatCurrency(contact.totalPurchased)}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>Contato não vinculado</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ScoreBadge score={row.score} />
                    </td>
                    <td className="max-w-64 px-4 py-3">
                      <p className="font-medium">
                        {SEGMENT_LABELS[row.classification]}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {row.reason}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{row.daysInactive}</span>
                      <span className="ml-1 text-xs text-muted-foreground">
                        dias
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1.5">
                        <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                        {row.owner?.name ?? "Sem consultora"}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {row.team?.name ?? "Sem equipe"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ClientRelativeTime
                        value={row.lastInteractionAt}
                        fallback="—"
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ClientRelativeTime
                        value={row.lastPurchaseAt}
                        fallback="—"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {STATUS_LABELS[row.status]}
                      </Badge>
                      {row.existingOpenDeal ? (
                        <Link
                          href={`/pipelines/${row.existingOpenDeal.pipelineId}/deals/${row.existingOpenDeal.id}`}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <Briefcase className="h-3 w-3" />
                          Negócio aberto
                        </Link>
                      ) : row.existingOpenDealId ? (
                        <Badge variant="secondary" className="mt-1">
                          Negócio aberto
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {contact && !row.existingOpenDealId ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="default"
                            onClick={() =>
                              setCreateTarget({
                                contactId: contact.id,
                                contactName: contact.name,
                                defaultOwnerId: row.owner?.id,
                              })
                            }
                          >
                            Criar oportunidade
                          </Button>
                        ) : null}
                        {contact ? (
                          <Link
                            href={`/contacts/${contact.id}`}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-card px-2.5 text-xs font-medium hover:bg-accent"
                          >
                            Analisar
                          </Link>
                        ) : (
                          <Button type="button" size="sm" variant="outline" disabled>
                            Análise indisponível
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>

      {createTarget ? (
        <CreateOpportunityDialog
          open
          onOpenChange={(open) => {
            if (!open) setCreateTarget(null);
          }}
          contactId={createTarget.contactId}
          contactName={createTarget.contactName}
          defaultOwnerId={createTarget.defaultOwnerId}
          createOpportunity={reactivationApi.createOpportunity}
          invalidateKeys={["reactivation"]}
        />
      ) : null}
    </>
  );
}

function ScoreTable({
  loading,
  rows,
  emptyIcon,
  emptyTitle,
}: {
  loading: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle: string;
  rows: {
    id: string;
    href: string;
    name: string;
    score: number;
    meta?: string;
    extra?: string;
    status?: string;
  }[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Contato</th>
            <th className="px-4 py-3 text-left font-medium">Score</th>
            <th className="hidden px-4 py-3 text-left font-medium md:table-cell">Motivo</th>
            <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Extra</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <Skeleton className="h-7 w-full" />
                  </td>
                </tr>
              ))
            : null}
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="p-4">
                <EmptyState icon={emptyIcon} title={emptyTitle} />
              </td>
            </tr>
          ) : null}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 hover:bg-accent/40">
              <td className="px-4 py-3">
                <Link href={r.href} className="font-medium hover:text-primary">
                  {r.name}
                </Link>
              </td>
              <td className="px-4 py-3">
                <ScoreBadge score={r.score} />
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                {r.meta || "—"}
              </td>
              <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                {r.extra || "—"}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">{r.status || "—"}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AfterSalesPage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.occurrences.list({ page }),
    queryFn: () => occurrencesApi.list({ page, pageSize: 20 }),
    retry: false,
  });

  return (
    <div>
      <PageHeader title="Pós-venda" description="Ocorrências e suporte pós-entrega." />
      {error ? <ErrorBanner message={(error as Error).message} /> : null}
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          : null}
        {!isLoading && (data?.data?.length ?? 0) === 0 ? (
          <EmptyState icon={Headphones} title="Nenhuma ocorrência" />
        ) : null}
        {data?.data?.map((o) => (
          <Link
            key={o.id}
            href={`/after-sales/${o.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft hover:border-primary/30"
          >
            <div>
              <p className="font-medium">{o.title}</p>
              <p className="text-xs text-muted-foreground">
                {o.contact?.name ?? "—"}
                {o.order?.number ? ` · Pedido #${o.order.number}` : ""}
                {" · "}
                <ClientRelativeTime value={o.openedAt} />
              </p>
            </div>
            <div className="flex gap-2">
              {o.priority ? <Badge variant="warning">{o.priority}</Badge> : null}
              <Badge>{o.status}</Badge>
            </div>
          </Link>
        ))}
      </div>
      {data?.meta ? (
        <PaginationBar
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

export function OccurrenceDetailPage({ occurrenceId }: { occurrenceId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.occurrences.detail(occurrenceId),
    queryFn: () => occurrencesApi.get(occurrenceId),
    retry: false,
  });

  const update = useMutation({
    mutationFn: (status: string) => occurrencesApi.update(occurrenceId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.occurrences.detail(occurrenceId) });
      queryClient.invalidateQueries({ queryKey: ["occurrences"] });
      toast.success("Ocorrência atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error || !data) {
    return <ErrorBanner message={(error as Error)?.message ?? "Ocorrência não encontrada"} />;
  }

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.type || undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{data.status}</Badge>
            {data.status !== "RESOLVED" && data.status !== "CLOSED" ? (
              <button
                type="button"
                className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
                disabled={update.isPending}
                onClick={() => update.mutate("RESOLVED")}
              >
                Marcar resolvida
              </button>
            ) : null}
          </div>
        }
      />
      <Card>
        <CardContent className="space-y-2 py-4 text-sm">
          <Row label="Contato" value={data.contact?.name} />
          <Row
            label="Pedido"
            value={data.order?.number ? `#${data.order.number}` : undefined}
          />
          <Row label="Prioridade" value={data.priority} />
          <Row label="Responsável" value={data.assignee?.name} />
          <Row
            label="Aberta em"
            value={<ClientRelativeTime value={data.openedAt} />}
          />
          <div className="pt-2">
            <p className="text-muted-foreground">Descrição</p>
            <p className="mt-1 whitespace-pre-wrap">{data.description || "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
