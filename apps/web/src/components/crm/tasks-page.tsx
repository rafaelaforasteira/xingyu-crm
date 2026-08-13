"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ListChecks,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { CreateTaskDialog, TaskStatusButton } from "@/components/crm/conversation/lead-tasks";
import { ErrorBanner, PageHeader } from "@/components/crm/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { Popover } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pipelinesApi, pipelineStagesApi, settingsApi, tasksApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Task, TaskStatusDefinition } from "@/lib/types";
import { cn } from "@/lib/utils";

type Scope = "mine" | "team" | "all";
type State = "open" | "completed";
type Due = "" | "overdue" | "today" | "upcoming" | "no-date";

const DUE_OPTIONS: Array<{ value: Due; label: string }> = [
  { value: "", label: "Todas abertas" },
  { value: "overdue", label: "Atrasadas" },
  { value: "today", label: "Hoje" },
  { value: "upcoming", label: "Próximas" },
  { value: "no-date", label: "Sem data" },
];

function dueBucket(task: Task) {
  if (!task.dueAt) return "no-date";
  const due = new Date(task.dueAt);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  if (due < start) return "overdue";
  if (due < end) return "today";
  return "upcoming";
}

function dueLabel(task: Task) {
  if (!task.dueAt) return "Sem data";
  const due = new Date(task.dueAt);
  const bucket = dueBucket(task);
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(due);
  if (bucket === "today") return `Hoje · ${time}`;
  if (bucket === "overdue")
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(due);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(due);
}

function TaskRow({
  task,
  statuses,
  pending,
  onStatus,
}: {
  task: Task;
  statuses: TaskStatusDefinition[];
  pending: boolean;
  onStatus: (status: TaskStatusDefinition) => void;
}) {
  const dealHref =
    task.dealId && task.pipelineId ? `/pipelines/${task.pipelineId}/deals/${task.dealId}` : null;
  const leadCode = task.deal && "leadSequence" in task.deal ? task.deal.leadSequence : null;
  const contactName =
    task.contact?.name ||
    [task.contact?.firstName, task.contact?.lastName].filter(Boolean).join(" ");
  const overdue = dueBucket(task) === "overdue" && task.statusDefinition?.category !== "DONE";
  return (
    <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] gap-2 border-b border-border/60 px-3 py-3 last:border-0 sm:grid-cols-[32px_minmax(0,1fr)_minmax(110px,0.5fr)_120px] sm:items-center lg:px-4">
      <TaskStatusButton task={task} statuses={statuses} pending={pending} onChange={onStatus} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" title={task.title}>
          {task.title}
        </p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1 text-xs text-muted-foreground">
          {dealHref ? (
            <Link href={dealHref} className="font-medium text-primary hover:underline">
              Lead #{String(leadCode ?? "—").padStart(4, "0")}
            </Link>
          ) : (
            <span>Tarefa avulsa</span>
          )}
          {contactName ? (
            <>
              <span>·</span>
              <span className="truncate">{contactName}</span>
            </>
          ) : null}
          {task.pipeline?.name ? (
            <>
              <span>·</span>
              <span className="truncate">{task.pipeline.name}</span>
            </>
          ) : null}
          {task.stage?.name ? (
            <>
              <span>·</span>
              <span className="truncate">{task.stage.name}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Avatar name={task.assignee?.name ?? "?"} src={task.assignee?.avatarUrl} size="sm" />
        <span className="truncate text-xs">{task.assignee?.name ?? "Sem responsável"}</span>
      </div>
      <time
        dateTime={task.dueAt ?? undefined}
        className={cn("text-xs text-muted-foreground", overdue && "font-medium text-destructive")}
      >
        {dueLabel(task)}
      </time>
    </div>
  );
}

export function TasksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = (params.get("scope") as Scope) || "mine";
  const state = (params.get("state") as State) || "open";
  const due = (params.get("due") as Due) || "";
  const pipelineId = params.get("pipeline") || "";
  const stageId = params.get("stage") || "";
  const assigneeId = params.get("assignee") || "";
  const statusId = params.get("status") || "";
  const priority = params.get("priority") || "";
  const page = Math.max(1, Number(params.get("page") || 1));
  const [search, setSearch] = React.useState(params.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = React.useState(search);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(params.get("new") === "1");
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
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      replace({ q: search || null, page: null });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search, replace]);

  const taskQuery = useQuery({
    queryKey: queryKeys.tasks.list({
      scope,
      state,
      due,
      pipelineId,
      stageId,
      assigneeId,
      statusId,
      priority,
      q: debouncedSearch,
      page,
    }),
    queryFn: () =>
      tasksApi.list({
        scope,
        state,
        due: due || undefined,
        pipelineId: pipelineId || undefined,
        stageId: stageId || undefined,
        assigneeId: assigneeId || undefined,
        statusDefinitionId: statusId || undefined,
        priority: priority || undefined,
        search: debouncedSearch || undefined,
        page,
        pageSize: 50,
      }),
    placeholderData: (previous) => previous,
    retry: false,
  });
  const statusesQuery = useQuery({
    queryKey: queryKeys.tasks.statuses,
    queryFn: () => tasksApi.statuses(),
    staleTime: 60_000,
  });
  const usersQuery = useQuery({
    queryKey: ["settings", "users", "tasks"],
    queryFn: () => settingsApi.users(),
    staleTime: 60_000,
  });
  const pipelinesQuery = useQuery({
    queryKey: queryKeys.pipelines.navigation,
    queryFn: () => pipelinesApi.navigation(),
    staleTime: 60_000,
  });
  const stagesQuery = useQuery({
    queryKey: ["pipelines", pipelineId, "stages", "tasks"],
    queryFn: () => pipelineStagesApi.list(pipelineId),
    enabled: Boolean(pipelineId),
    staleTime: 60_000,
  });
  const currentUser = (usersQuery.data ?? []).find((candidate) => candidate.id === user?.id);
  const teamAvailable =
    Boolean(currentUser?.teamId) && (user?.role === "ADMIN" || user?.role === "MANAGER");
  const statuses = statusesQuery.data ?? [];
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
  };
  const statusMutation = useMutation({
    mutationFn: ({ id, statusDefinitionId }: { id: string; statusDefinitionId: string }) =>
      tasksApi.update(id, { statusDefinitionId }),
    onMutate: async ({ id, statusDefinitionId }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["tasks"] });
      queryClient.setQueriesData({ queryKey: ["tasks"] }, (old: unknown) => {
        if (!old || typeof old !== "object" || !("data" in old)) return old;
        return {
          ...old,
          data: (old as { data: Task[] }).data.map((task) =>
            task.id === id
              ? {
                  ...task,
                  statusDefinitionId,
                  statusDefinition: statuses.find((item) => item.id === statusDefinitionId),
                }
              : task,
          ),
        };
      });
      return snapshots;
    },
    onError: (error: Error, _variables, snapshots) => {
      snapshots?.forEach(([key, value]) => queryClient.setQueryData(key, value));
      toast.error(error.message);
    },
    onSettled: refresh,
  });
  const tasks = taskQuery.data?.data ?? [];
  const groups =
    state === "completed"
      ? [{ key: "completed", label: "Concluídas", tasks }]
      : [
          {
            key: "overdue",
            label: "Atrasadas",
            tasks: tasks.filter((task) => dueBucket(task) === "overdue"),
          },
          {
            key: "today",
            label: "Hoje",
            tasks: tasks.filter((task) => dueBucket(task) === "today"),
          },
          {
            key: "upcoming",
            label: "Próximas",
            tasks: tasks.filter((task) => dueBucket(task) === "upcoming"),
          },
          {
            key: "no-date",
            label: "Sem data",
            tasks: tasks.filter((task) => dueBucket(task) === "no-date"),
          },
        ];
  const activeFilters = [pipelineId, stageId, assigneeId, statusId, priority].filter(
    Boolean,
  ).length;

  return (
    <div data-testid="tasks-page">
      <PageHeader
        title="Tarefas"
        description="Organize e acompanhe as atividades da operação."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        }
      />
      <div className="space-y-4">
        <Tabs
          value={scope}
          onValueChange={(value) => replace({ scope: value === "mine" ? null : value, page: null })}
        >
          <TabsList>
            <TabsTrigger value="mine">Minhas tarefas</TabsTrigger>
            <TabsTrigger value="team" className={!teamAvailable ? "hidden" : undefined}>
              Equipe
            </TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <Button
              size="sm"
              variant={state === "open" ? "secondary" : "ghost"}
              onClick={() => replace({ state: null, due: null, page: null })}
            >
              Abertas
            </Button>
            <Button
              size="sm"
              variant={state === "completed" ? "secondary" : "ghost"}
              onClick={() => replace({ state: "completed", due: null, page: null })}
            >
              Concluídas
            </Button>
          </div>
          {state === "open"
            ? DUE_OPTIONS.map((option) => (
                <Button
                  key={option.value || "all"}
                  size="sm"
                  variant={due === option.value ? "secondary" : "ghost"}
                  onClick={() => replace({ due: option.value || null, page: null })}
                >
                  {option.label}
                </Button>
              ))
            : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar tarefas..."
              aria-label="Buscar tarefas"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Popover
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            align="end"
            trigger={
              <Button variant="outline" onClick={() => setFiltersOpen((value) => !value)}>
                <Filter className="h-4 w-4" />
                Filtros{activeFilters ? <Badge className="ml-1">{activeFilters}</Badge> : null}
              </Button>
            }
          >
            <div className="space-y-3 p-3">
              <div>
                <Label>Pipeline</Label>
                <Select
                  value={pipelineId}
                  onChange={(event) =>
                    replace({ pipeline: event.target.value || null, stage: null, page: null })
                  }
                >
                  <option value="">Todos acessíveis</option>
                  {(pipelinesQuery.data ?? []).map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Etapa</Label>
                <Select
                  disabled={!pipelineId}
                  value={stageId}
                  onChange={(event) => replace({ stage: event.target.value || null, page: null })}
                >
                  <option value="">Todas</option>
                  {(stagesQuery.data ?? []).map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Responsável</Label>
                <Select
                  value={assigneeId}
                  onChange={(event) =>
                    replace({ assignee: event.target.value || null, page: null })
                  }
                >
                  <option value="">Todos permitidos</option>
                  {(usersQuery.data ?? []).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={statusId}
                  onChange={(event) => replace({ status: event.target.value || null, page: null })}
                >
                  <option value="">Todos</option>
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select
                  value={priority}
                  onChange={(event) =>
                    replace({ priority: event.target.value || null, page: null })
                  }
                >
                  <option value="">Todas</option>
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </Select>
              </div>
              {activeFilters ? (
                <Button
                  className="w-full"
                  variant="ghost"
                  onClick={() =>
                    replace({
                      pipeline: null,
                      stage: null,
                      assignee: null,
                      status: null,
                      priority: null,
                      page: null,
                    })
                  }
                >
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          </Popover>
        </div>
        {taskQuery.error ? <ErrorBanner message={(taskQuery.error as Error).message} /> : null}
        {taskQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : null}
        {!taskQuery.isLoading && !tasks.length ? (
          <EmptyState
            icon={state === "completed" ? CheckCircle2 : CalendarClock}
            title={state === "completed" ? "Nenhuma tarefa concluída" : "Nenhuma tarefa por aqui"}
            description={
              scope === "team"
                ? "Sua equipe não possui tarefas neste recorte."
                : "Ajuste os filtros ou crie uma nova tarefa."
            }
            actionLabel="Nova tarefa"
            onAction={() => setCreateOpen(true)}
          />
        ) : null}
        {groups
          .filter((group) => group.tasks.length)
          .map((group) => (
            <section
              key={group.key}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"
            >
              <header className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-xs font-bold uppercase tracking-wide">{group.label}</h2>
                <Badge variant="outline">{group.tasks.length}</Badge>
              </header>
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  statuses={statuses}
                  pending={statusMutation.isPending && statusMutation.variables?.id === task.id}
                  onStatus={(status) =>
                    statusMutation.mutate({ id: task.id, statusDefinitionId: status.id })
                  }
                />
              ))}
            </section>
          ))}
        {(taskQuery.data?.meta.totalPages ?? 1) > 1 ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {page} de {taskQuery.data?.meta.totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="outline"
                disabled={page <= 1}
                onClick={() => replace({ page: String(page - 1) })}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                disabled={page >= (taskQuery.data?.meta.totalPages ?? 1)}
                onClick={() => replace({ page: String(page + 1) })}
                aria-label="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={(value) => {
          setCreateOpen(value);
          if (!value) replace({ new: null });
        }}
        links={{}}
        owner={currentUser ?? undefined}
        statuses={statuses}
        users={usersQuery.data ?? []}
        description="Crie uma tarefa avulsa ou vincule-a depois a um lead."
        onCreated={() => {
          refresh();
          toast.success("Tarefa criada");
        }}
      />
    </div>
  );
}
