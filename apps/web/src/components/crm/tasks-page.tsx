"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { pipelinesApi, settingsApi, tasksApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatTaskDue } from "@/lib/utils";
import type { Task, TaskStatusDefinition } from "@/lib/types";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/form-controls";
import { Avatar } from "@/components/ui/avatar";

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

function contactLabel(task: Task) {
  const contact = task.contact as { name?: string; firstName?: string; lastName?: string } | null;
  if (!contact) return "—";
  if (contact.name) return contact.name;
  return `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim() || "—";
}

export function TasksPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [filters, setFilters] = React.useState({
    assigneeId: "",
    pipelineId: "",
    priority: "",
    overdue: false,
    due: "",
    search: "",
  });
  const [open, setOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [draftStatusId, setDraftStatusId] = React.useState<string>("");
  const [form, setForm] = React.useState({
    title: "",
    priority: "MEDIUM",
    dueAt: "",
    assigneeId: "",
    dealId: "",
    contactId: "",
    pipelineId: "",
    statusDefinitionId: "",
  });
  const [newStatusName, setNewStatusName] = React.useState("");
  const [newStatusColor, setNewStatusColor] = React.useState("#64748B");
  const [newStatusCategory, setNewStatusCategory] = React.useState("OPEN");

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setOpen(true);
    const overdue = searchParams.get("overdue") === "1";
    const due = searchParams.get("view") === "today" ? "today" : "";
    if (overdue || due) {
      setFilters((current) => ({
        ...current,
        overdue: overdue || current.overdue,
        due: due || current.due,
      }));
    }
  }, [searchParams]);

  const boardParams = React.useMemo(
    () => ({
      assigneeId: filters.assigneeId || undefined,
      pipelineId: filters.pipelineId || undefined,
      priority: filters.priority || undefined,
      overdue: filters.overdue || undefined,
      due: filters.due || undefined,
      search: filters.search || undefined,
      pageSize: 100,
    }),
    [filters],
  );

  const boardQuery = useQuery({
    queryKey: queryKeys.tasks.board(boardParams),
    queryFn: () => tasksApi.board(boardParams),
    retry: false,
    placeholderData: (previous) => previous,
  });

  const statusesQuery = useQuery({
    queryKey: queryKeys.tasks.statuses,
    queryFn: () => tasksApi.statuses(),
    staleTime: 60_000,
  });

  const usersQuery = useQuery({
    queryKey: ["settings", "users"],
    queryFn: () => settingsApi.users(),
    staleTime: 60_000,
  });

  const pipelinesQuery = useQuery({
    queryKey: queryKeys.pipelines.navigation,
    queryFn: () => pipelinesApi.navigation(),
    staleTime: 60_000,
  });

  const invalidateTasks = () => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const createTask = useMutation({
    mutationFn: () =>
      tasksApi.create({
        title: form.title,
        priority: form.priority,
        dueAt: form.dueAt || undefined,
        assigneeId: form.assigneeId || undefined,
        dealId: form.dealId || undefined,
        contactId: form.contactId || undefined,
        pipelineId: form.pipelineId || undefined,
        statusDefinitionId:
          form.statusDefinitionId || draftStatusId || undefined,
      }),
    onSuccess: () => {
      invalidateTasks();
      toast.success("Tarefa criada");
      setOpen(false);
      setForm({
        title: "",
        priority: "MEDIUM",
        dueAt: "",
        assigneeId: "",
        dealId: "",
        contactId: "",
        pipelineId: "",
        statusDefinitionId: "",
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const patchTask = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof tasksApi.update>[1];
    }) => tasksApi.update(id, data),
    onSuccess: () => {
      invalidateTasks();
      toast.success("Tarefa atualizada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const completeTask = useMutation({
    mutationFn: (id: string) => tasksApi.complete(id),
    onSuccess: () => {
      invalidateTasks();
      toast.success("Tarefa concluída");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createStatus = useMutation({
    mutationFn: () =>
      tasksApi.createStatus({
        name: newStatusName,
        color: newStatusColor,
        category: newStatusCategory,
      }),
    onSuccess: () => {
      invalidateTasks();
      toast.success("Status criado");
      setNewStatusName("");
      setStatusOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openCreateForStatus = (status: TaskStatusDefinition) => {
    setDraftStatusId(status.id);
    setForm((current) => ({ ...current, statusDefinitionId: status.id }));
    setOpen(true);
  };

  const groups = boardQuery.data ?? [];

  return (
    <div data-testid="tasks-page">
      <PageHeader
        title="Tarefas"
        description="Lista operacional agrupada por status personalizáveis."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setStatusOpen(true)}>
              <Settings2 className="h-4 w-4" />
              Status
            </Button>
            <Button
              onClick={() => {
                setDraftStatusId(statusesQuery.data?.[0]?.id ?? "");
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nova tarefa
            </Button>
          </div>
        }
      />
      {boardQuery.error ? (
        <ErrorBanner message={(boardQuery.error as Error).message} />
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar tarefas…"
          value={filters.search}
          onChange={(event) =>
            setFilters((current) => ({ ...current, search: event.target.value }))
          }
          className="sm:max-w-xs"
          aria-label="Buscar tarefas"
        />
        <Select
          aria-label="Filtrar por responsável"
          className="w-44"
          value={filters.assigneeId}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              assigneeId: event.target.value,
            }))
          }
        >
          <option value="">Todas consultoras</option>
          {(usersQuery.data ?? []).map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por pipeline"
          className="w-44"
          value={filters.pipelineId}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              pipelineId: event.target.value,
            }))
          }
        >
          <option value="">Todos pipelines</option>
          {(pipelinesQuery.data ?? []).map((pipeline) => (
            <option key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por prioridade"
          className="w-36"
          value={filters.priority}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              priority: event.target.value,
            }))
          }
        >
          <option value="">Prioridade</option>
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
          <option value="URGENT">Urgente</option>
        </Select>
        <Select
          aria-label="Filtrar por vencimento"
          className="w-36"
          value={filters.due}
          onChange={(event) =>
            setFilters((current) => ({
              ...current,
              due: event.target.value,
              overdue: false,
            }))
          }
        >
          <option value="">Vencimento</option>
          <option value="today">Hoje</option>
          <option value="week">Esta semana</option>
        </Select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={filters.overdue}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                overdue: event.target.checked,
                due: "",
              }))
            }
          />
          Vencidas
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="hidden grid-cols-[minmax(16rem,1.6fr)_7rem_9rem_8rem_9rem_9rem_8rem_7rem] gap-2 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid">
          <span>Nome</span>
          <span>Prioridade</span>
          <span>Responsável</span>
          <span>Vencimento</span>
          <span>Lead</span>
          <span>Pipeline</span>
          <span>Etapa</span>
          <span>Ações</span>
        </div>

        {boardQuery.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : null}

        {!boardQuery.isLoading && groups.every((group) => group.count === 0) ? (
          <div className="p-6">
            <EmptyState icon={CheckSquare} title="Nenhuma tarefa" />
          </div>
        ) : null}

        {groups.map((group) => {
          const isCollapsed = collapsed[group.status.id];
          return (
            <section
              key={group.status.id}
              data-testid={`task-group-${group.status.slug}`}
              className="border-b border-border/70 last:border-0"
            >
              <div className="flex items-center gap-2 bg-muted/20 px-3 py-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() =>
                    setCollapsed((current) => ({
                      ...current,
                      [group.status.id]: !current[group.status.id],
                    }))
                  }
                  aria-expanded={!isCollapsed}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: group.status.color }}
                    aria-hidden
                  />
                  <span className="truncate text-xs font-bold uppercase tracking-wide">
                    {group.status.name}
                  </span>
                  <Badge variant="outline" className="font-normal">
                    {group.count}
                  </Badge>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openCreateForStatus(group.status)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </div>

              {!isCollapsed
                ? group.tasks.map((task) => (
                    <div
                      key={task.id}
                      data-testid={`task-row-${task.id}`}
                      className="grid gap-2 border-t border-border/50 px-3 py-2.5 text-sm lg:grid-cols-[minmax(16rem,1.6fr)_7rem_9rem_8rem_9rem_9rem_8rem_7rem] lg:items-center lg:px-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{task.title}</p>
                        <p className="truncate text-xs text-muted-foreground lg:hidden">
                          {contactLabel(task)} · {task.pipeline?.name ?? "—"}
                        </p>
                      </div>
                      <Select
                        aria-label={`Prioridade de ${task.title}`}
                        className="h-8 text-xs"
                        value={String(task.priority ?? "MEDIUM")}
                        onChange={(event) =>
                          patchTask.mutate({
                            id: task.id,
                            data: { priority: event.target.value },
                          })
                        }
                      >
                        {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </Select>
                      <div className="flex items-center gap-2 truncate">
                        <Avatar name={task.assignee?.name ?? "?"} size="sm" />
                        <span className="truncate text-xs">
                          {task.assignee?.name ?? "—"}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-xs",
                          task.dueAt &&
                            new Date(task.dueAt) < new Date() &&
                            task.status !== "COMPLETED" &&
                            "font-medium text-destructive",
                        )}
                      >
                        {formatTaskDue(task.dueAt)}
                      </span>
                      <span className="truncate text-xs">
                        {task.contactId ? (
                          <Link
                            href={`/contacts/${task.contactId}`}
                            className="text-primary hover:underline"
                          >
                            {contactLabel(task)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </span>
                      <span className="truncate text-xs">
                        {task.pipeline?.name ?? "—"}
                      </span>
                      <span className="truncate text-xs">
                        {task.stage?.name ?? "—"}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        <Select
                          aria-label={`Status de ${task.title}`}
                          className="h-8 min-w-[7rem] text-xs"
                          value={task.statusDefinitionId ?? ""}
                          onChange={(event) =>
                            patchTask.mutate({
                              id: task.id,
                              data: { statusDefinitionId: event.target.value },
                            })
                          }
                        >
                          {(statusesQuery.data ?? []).map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.name}
                            </option>
                          ))}
                        </Select>
                        {task.status !== "COMPLETED" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => completeTask.mutate(task.id)}
                          >
                            Concluir
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                : null}
            </section>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen} title="Nova tarefa">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            createTask.mutate();
          }}
        >
          <div>
            <Label htmlFor="task-title">Nome</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="task-status">Status</Label>
              <Select
                id="task-status"
                value={form.statusDefinitionId || draftStatusId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    statusDefinitionId: event.target.value,
                  }))
                }
              >
                {(statusesQuery.data ?? []).map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-priority">Prioridade</Label>
              <Select
                id="task-priority"
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value,
                  }))
                }
              >
                {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-assignee">Responsável</Label>
              <Select
                id="task-assignee"
                value={form.assigneeId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    assigneeId: event.target.value,
                  }))
                }
              >
                <option value="">Eu (padrão)</option>
                {(usersQuery.data ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-due">Vencimento</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dueAt: event.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="task-pipeline">Pipeline</Label>
              <Select
                id="task-pipeline"
                value={form.pipelineId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    pipelineId: event.target.value,
                  }))
                }
              >
                <option value="">Opcional</option>
                {(pipelinesQuery.data ?? []).map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="task-deal">Deal ID</Label>
              <Input
                id="task-deal"
                placeholder="Opcional — preenche pipeline/etapa"
                value={form.dealId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dealId: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTask.isPending || !form.title.trim()}>
              Criar
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen} title="Status personalizados">
        <div className="space-y-4">
          <ul className="space-y-2">
            {(statusesQuery.data ?? []).map((status) => (
              <li
                key={status.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="font-semibold uppercase">{status.name}</span>
                <Badge variant="outline">{status.category}</Badge>
              </li>
            ))}
          </ul>
          <form
            className="space-y-3 border-t border-border pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              createStatus.mutate();
            }}
          >
            <div>
              <Label htmlFor="status-name">Novo status</Label>
              <Input
                id="status-name"
                value={newStatusName}
                onChange={(event) => setNewStatusName(event.target.value)}
                placeholder="Ex.: AGUARDANDO CLIENTE"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="status-color">Cor</Label>
                <Input
                  id="status-color"
                  type="color"
                  value={newStatusColor}
                  onChange={(event) => setNewStatusColor(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="status-category">Categoria</Label>
                <Select
                  id="status-category"
                  value={newStatusCategory}
                  onChange={(event) => setNewStatusCategory(event.target.value)}
                >
                  <option value="OPEN">Aberto</option>
                  <option value="IN_PROGRESS">Em andamento</option>
                  <option value="DONE">Concluído</option>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={!newStatusName.trim() || createStatus.isPending}>
              Adicionar status
            </Button>
          </form>
        </div>
      </Dialog>
    </div>
  );
}
