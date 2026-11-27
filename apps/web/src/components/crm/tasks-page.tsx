"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { CreateTaskDialog, formatRelatedLead, TaskStatusButton } from "@/components/crm/conversation/lead-tasks";
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
import { TaskWorkspace } from "@/components/crm/task-workspace";

type Scope = "mine" | "team" | "all";
type State = "" | "open" | "completed";
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
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const dayDistance = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(due);
  if (bucket === "today") return `Hoje · ${time}`;
  if (dayDistance === 1) return "Amanhã";
  if (bucket === "overdue") {
    const days = Math.abs(dayDistance);
    return `${days} ${days === 1 ? "dia" : "dias"} atrás`;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(due);
}

function TaskAssigneePicker({
  task,
  users,
  onUpdate,
}: {
  task: Task;
  users: Array<{ id: string; name: string; avatarUrl?: string | null }>;
  onUpdate: (data: Partial<Task>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const filtered = users.filter((member) =>
    member.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")),
  );
  const choose = (assigneeId: string | null) => {
    onUpdate({ assigneeId });
    setOpen(false);
    setSearch("");
  };
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      contentWidth={290}
      aria-label={`Escolher responsável de ${task.title}`}
      trigger={
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-primary/10"
          title={task.assignee?.name ? `Responsável: ${task.assignee.name}` : "Adicionar responsável"}
          onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}
        >
          {task.assignee ? (
            <Avatar name={task.assignee.name} src={task.assignee.avatarUrl} size="sm" />
          ) : (
            <UserRound className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      }
    >
      <div className="border-b border-border/70 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-9 bg-muted/30 pl-9"
            placeholder="Buscar responsável..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoFocus
          />
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto p-2">
        <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Responsáveis</p>
        <button type="button" className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-muted" onClick={() => choose(null)}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted"><UserRound className="h-4 w-4 text-muted-foreground" /></span>
          <span className="flex-1">Sem responsável</span>
          {!task.assigneeId ? <Check className="h-4 w-4 text-primary" /> : null}
        </button>
        {filtered.map((member) => (
          <button key={member.id} type="button" className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-muted", task.assigneeId === member.id && "bg-primary/10")} onClick={() => choose(member.id)}>
            <Avatar name={member.name} src={member.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1 truncate">{member.name}</span>
            {task.assigneeId === member.id ? <Check className="h-4 w-4 text-primary" /> : null}
          </button>
        ))}
      </div>
    </Popover>
  );
}

function TaskDatePicker({ task, overdue, onUpdate }: { task: Task; overdue: boolean; onUpdate: (data: Partial<Task>) => void }) {
  const [open, setOpen] = React.useState(false);
  const initial = task.dueAt ? new Date(task.dueAt) : new Date();
  const [month, setMonth] = React.useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  React.useEffect(() => {
    if (open) {
      const current = task.dueAt ? new Date(task.dueAt) : new Date();
      setMonth(new Date(current.getFullYear(), current.getMonth(), 1));
    }
  }, [open, task.dueAt]);
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const selected = task.dueAt ? new Date(task.dueAt) : null;
  const today = new Date();
  const selectDay = (day: number) => {
    onUpdate({ dueAt: new Date(year, monthIndex, day, 12).toISOString() });
    setOpen(false);
  };
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      contentWidth={284}
      aria-label={`Escolher data de ${task.title}`}
      trigger={
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-primary/10" title={task.dueAt ? `Data: ${dueLabel(task)}` : "Selecionar data"} onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}>
          <CalendarDays className={cn("h-4 w-4 text-muted-foreground", overdue && "text-destructive")} />
        </button>
      }
    >
      <div className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <strong className="text-sm capitalize">{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month)}</strong>
          <div className="flex gap-1">
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Mês anterior" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Próximo mês" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
          {['D','S','T','Q','Q','S','S'].map((label, index) => <span key={`${label}-${index}`} className="py-1">{label}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, index) => {
            if (!day) return <span key={index} className="h-8" />;
            const isSelected = selected && selected.getFullYear() === year && selected.getMonth() === monthIndex && selected.getDate() === day;
            const isToday = today.getFullYear() === year && today.getMonth() === monthIndex && today.getDate() === day;
            return <button key={index} type="button" className={cn("h-8 rounded-lg text-xs transition hover:bg-primary/10 hover:text-primary", isToday && !isSelected && "border border-primary/30 font-semibold text-primary", isSelected && "bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground")} onClick={() => selectDay(day)}>{day}</button>;
          })}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-3">
          <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" onClick={() => { onUpdate({ dueAt: null }); setOpen(false); }}>Limpar</Button>
          <Button type="button" size="sm" variant="ghost" className="text-primary" onClick={() => { const now = new Date(); onUpdate({ dueAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString() }); setOpen(false); }}>Hoje</Button>
        </div>
      </div>
    </Popover>
  );
}

function TaskRow({
  task,
  statuses,
  pending,
  onStatus,
  onOpen,
  users,
  onUpdate,
}: {
  task: Task;
  statuses: TaskStatusDefinition[];
  pending: boolean;
  onStatus: (status: TaskStatusDefinition) => void;
  onOpen: () => void;
  users: Array<{ id: string; name: string; avatarUrl?: string | null }>;
  onUpdate: (data: Partial<Task>) => void;
}) {
  const overdue = dueBucket(task) === "overdue" && task.statusDefinition?.category !== "DONE";
  const related = task.order
    ? { href: `/orders?order=${task.order.id}`, label: `Pedido #${task.order.number}` }
    : task.deal
      ? {
          href: `/pipelines/${task.deal.pipelineId}/deals/${task.deal.id}`,
          label: task.contact?.name
            ? `Lead #${task.deal.leadSequence == null ? "—" : String(task.deal.leadSequence).padStart(4, "0")} · ${task.contact.name}`
            : formatRelatedLead(task.deal),
        }
      : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => { if (event.key === "Enter") onOpen(); }}
      className="grid min-w-0 cursor-pointer items-center gap-2 border-b border-border/60 px-4 py-2 transition hover:bg-primary/[0.035] last:border-0"
      style={{ gridTemplateColumns: "28px minmax(280px, 620px) 34px 34px minmax(0, 1fr)" }}
    >
      <div onClick={(event) => event.stopPropagation()}>
        <TaskStatusButton task={task} statuses={statuses} pending={pending} onChange={onStatus} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-foreground" title={task.title}>{task.title}</p>
        {related ? (
          <Link
            href={related.href}
            onClick={(event) => event.stopPropagation()}
            className="mt-0.5 block truncate text-[11px] text-muted-foreground transition hover:text-primary hover:underline"
          >
            Relacionado: {related.label}
          </Link>
        ) : null}
      </div>
      <div onClick={(event) => event.stopPropagation()}><TaskAssigneePicker task={task} users={users} onUpdate={onUpdate} /></div>
      <div onClick={(event) => event.stopPropagation()}><TaskDatePicker task={task} overdue={overdue} onUpdate={onUpdate} /></div>
      <span className="hidden lg:block" aria-hidden="true" />
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
  const state = (params.get("state") as State) || "";
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
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
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
        state: state || undefined,
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
    retry: 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2_000),
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
  const inlineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => tasksApi.update(id, data),
    onError: (error: Error) => toast.error(error.message),
    onSuccess: refresh,
  });
  const tasks = taskQuery.data?.data ?? [];
  React.useEffect(() => {
    const taskId = params.get("task");
    if (taskId && !selectedTask) {
      const match = tasks.find((task) => task.id === taskId);
      if (match) setSelectedTask(match);
    }
  }, [params, selectedTask, tasks]);
  const visibleStatuses = statuses;
  const legacyCategory = (task: Task) =>
    task.status === "COMPLETED" || task.status === "DONE" || task.status === "CANCELLED"
      ? "DONE"
      : task.status === "IN_PROGRESS" ? "IN_PROGRESS" : "OPEN";
  const groups = visibleStatuses.map((status) => ({
    key: status.id,
    label: status.name,
    color: status.color,
    tasks: tasks.filter((task) =>
      task.statusDefinitionId === status.id ||
      (!task.statusDefinitionId && legacyCategory(task) === status.category),
    ),
  }));
  const activeFilters = [
    state,
    due,
    pipelineId,
    stageId,
    assigneeId,
    statusId,
    priority,
  ].filter(Boolean).length;

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
        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
          <Tabs
            className="shrink-0"
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
          <div className="relative w-full min-w-[220px] sm:w-72 lg:w-80">
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
            contentWidth={380}
            aria-label="Filtrar tarefas"
            trigger={
              <Button
                className="h-10 w-10 shrink-0 rounded-full p-0 hover:bg-primary/10"
                variant="ghost"
                aria-label="Filtrar tarefas"
                title="Filtrar tarefas"
                onClick={() => setFiltersOpen((value) => !value)}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Filter className="h-4 w-4" />
                </span>
              </Button>
            }
          >
            <div className="space-y-4 p-4">
              <div>
                <Label className="mb-2 block">Situação</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant={state === "" ? "secondary" : "outline"}
                    onClick={() => replace({ state: null, due: null, page: null })}
                  >
                    Todas
                  </Button>
                  <Button
                    size="sm"
                    variant={state === "open" ? "secondary" : "outline"}
                    onClick={() => replace({ state: "open", due: null, page: null })}
                  >
                    Abertas
                  </Button>
                  <Button
                    size="sm"
                    variant={state === "completed" ? "secondary" : "outline"}
                    onClick={() => replace({ state: "completed", due: null, page: null })}
                  >
                    Concluídas
                  </Button>
                </div>
              </div>
              {state !== "completed" ? (
                <div>
                  <Label className="mb-2 block">Prazo</Label>
                  <div className="flex flex-wrap gap-2">
                    {DUE_OPTIONS.map((option) => (
                      <Button
                        key={option.value || "all"}
                        size="sm"
                        variant={due === option.value ? "secondary" : "outline"}
                        onClick={() => replace({ due: option.value || null, page: null })}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="border-t border-border/70 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtros avançados</p>
              </div>
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
                      state: null,
                      due: null,
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
        {groups.map((group) => (
            <section
              key={group.key}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"
            >
              <button type="button" className="flex w-full items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5 text-left" onClick={() => setCollapsed((value) => ({ ...value, [group.key]: !value[group.key] }))}>
                <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed[group.key] && "-rotate-90")} style={{ color: group.color }} />
                <h2 className="text-xs font-bold uppercase tracking-wide">{group.label}</h2>
                <Badge variant="outline" title={`Exibindo ${Math.min(group.tasks.length, 3)} de ${group.tasks.length}`}>
                  {Math.min(group.tasks.length, 3)}
                </Badge>
              </button>
              {!collapsed[group.key] ? group.tasks.slice(0, 3).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  statuses={statuses}
                  pending={statusMutation.isPending && statusMutation.variables?.id === task.id}
                  onStatus={(status) =>
                    statusMutation.mutate({ id: task.id, statusDefinitionId: status.id })
                  }
                  onOpen={() => setSelectedTask(task)}
                  users={usersQuery.data ?? []}
                  onUpdate={(data) => inlineMutation.mutate({ id: task.id, data })}
                />
              )) : null}
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
      <TaskWorkspace
        task={selectedTask}
        open={Boolean(selectedTask)}
        onOpenChange={(value) => { if (!value) setSelectedTask(null); }}
        statuses={statuses}
        users={usersQuery.data ?? []}
        onChanged={refresh}
      />
    </div>
  );
}
