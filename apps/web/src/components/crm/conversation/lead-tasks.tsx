"use client";

import * as React from "react";
import { Check, Circle, Loader2, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label, Select } from "@/components/ui/form-controls";
import { Popover } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { pipelinesApi, settingsApi, tasksApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Task, TaskStatusDefinition, UserRef } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatLeadTaskDue, isTaskDone, sortLeadTasks } from "./lead-task-utils";

export type LeadLinks = {
  contactId?: string;
  dealId?: string;
  pipelineId?: string;
  stageId?: string;
};

export function TaskStatusButton({
  task,
  statuses,
  onChange,
  pending,
}: {
  task: Task;
  statuses: TaskStatusDefinition[];
  onChange: (status: TaskStatusDefinition) => void;
  pending: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const current = task.statusDefinition;
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align="start"
      side="bottom"
      sideOffset={6}
      collisionPadding={8}
      contentWidth={180}
      contentClassName="rounded-lg"
      aria-label={`Status de ${task.title}`}
      trigger={
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Alterar status de ${task.title}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={pending}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((value) => !value);
          }}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isTaskDone(task) ? (
            <Check className="h-4 w-4" style={{ color: current?.color }} />
          ) : (
            <Circle className="h-4 w-4" style={{ color: current?.color }} />
          )}
        </button>
      }
    >
      <div className="max-h-60 overflow-y-auto p-1.5">
        {statuses.map((status) => (
          <button
            key={status.id}
            type="button"
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              status.id === current?.id && "bg-muted font-medium",
            )}
            aria-current={status.id === current?.id ? "true" : undefined}
            autoFocus={status.id === current?.id}
            onClick={() => {
              onChange(status);
              setOpen(false);
            }}
          >
            {status.category === "DONE" ? (
              <Check className="h-3.5 w-3.5" style={{ color: status.color }} />
            ) : (
              <Circle className="h-3.5 w-3.5" style={{ color: status.color }} />
            )}
            <span className="min-w-0 truncate" title={status.name}>
              {status.name}
            </span>
          </button>
        ))}
      </div>
    </Popover>
  );
}

function TaskRow({
  task,
  statuses,
  onStatus,
  pending,
}: {
  task: Task;
  statuses: TaskStatusDefinition[];
  onStatus: (task: Task, status: TaskStatusDefinition) => void;
  pending: boolean;
}) {
  const due = formatLeadTaskDue(task.dueAt);
  const assigneeName = task.assignee?.name?.trim() || "Sem responsável";
  return (
    <div
      className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)_24px_auto] items-center gap-2 py-1"
      data-testid="lead-task-row"
    >
      <TaskStatusButton
        task={task}
        statuses={statuses}
        pending={pending}
        onChange={(status) => onStatus(task, status)}
      />
      <span className="truncate text-xs" title={task.title}>
        {task.title}
      </span>
      <span title={assigneeName} aria-label={assigneeName}>
        <Avatar
          name={task.assignee?.name || "?"}
          src={task.assignee?.avatarUrl}
          className="h-6 w-6 text-[9px]"
        />
      </span>
      <time
        dateTime={task.dueAt ?? undefined}
        title={due.title}
        className={cn(
          "whitespace-nowrap text-[11px] text-muted-foreground",
          due.overdue && "text-amber-700",
          due.label === "Hoje" && "font-medium text-foreground",
        )}
      >
        {due.label}
      </time>
    </div>
  );
}

function FullTaskRow(props: React.ComponentProps<typeof TaskRow>) {
  return (
    <li>
      <TaskRow {...props} />
      {props.task.description ? (
        <p className="ml-7 whitespace-pre-wrap text-xs text-muted-foreground">
          {props.task.description}
        </p>
      ) : null}
    </li>
  );
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  links,
  owner,
  statuses,
  users,
  onCreated,
  initialDescription = "",
  sourceNoteId,
  description = "Vinculada ao lead atual.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: LeadLinks;
  owner?: UserRef | null;
  statuses: TaskStatusDefinition[];
  users: UserRef[];
  onCreated: (task: Task) => void;
  initialDescription?: string;
  sourceNoteId?: string;
  description?: string;
}) {
  const defaultStatus = statuses.find((status) => status.category === "OPEN") ?? statuses[0];
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    statusDefinitionId: "",
    assigneeId: "",
    date: "",
    time: "",
  });
  const [error, setError] = React.useState("");
  React.useEffect(() => {
    if (open)
      setForm({
        title: "",
        description: initialDescription,
        statusDefinitionId: defaultStatus?.id ?? "",
        assigneeId: owner?.id ?? "",
        date: "",
        time: "",
      });
  }, [open, defaultStatus?.id, owner?.id, initialDescription]);
  const create = useMutation({
    mutationFn: () => {
      const title = form.title.trim();
      if (!title) throw new Error("Informe o título da tarefa.");
      const dueAt = form.date
        ? new Date(`${form.date}T${form.time || "12:00"}`).toISOString()
        : undefined;
      return tasksApi.create({
        title,
        description: form.description.trim() || undefined,
        statusDefinitionId: form.statusDefinitionId || undefined,
        assigneeId: form.assigneeId || undefined,
        dueAt,
        sourceNoteId,
        ...links,
      });
    },
    onSuccess: (task) => {
      onCreated(task);
      onOpenChange(false);
    },
    onError: (value) =>
      setError(value instanceof Error ? value.message : "Não foi possível criar a tarefa."),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Nova tarefa" description={description}>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          create.mutate();
        }}
      >
        <div>
          <Label htmlFor="lead-task-title">Título *</Label>
          <Input
            id="lead-task-title"
            maxLength={200}
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="lead-task-description">Descrição</Label>
          <Textarea
            id="lead-task-description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="lead-task-status">Status</Label>
            <Select
              id="lead-task-status"
              value={form.statusDefinitionId}
              onChange={(e) => setForm({ ...form, statusDefinitionId: e.target.value })}
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="lead-task-assignee">Responsável</Label>
            <Select
              id="lead-task-assignee"
              value={form.assigneeId}
              onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
            >
              <option value="">Sem responsável</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="lead-task-date">Data de vencimento</Label>
            <Input
              id="lead-task-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="lead-task-time">Horário (opcional)</Label>
            <Input
              id="lead-task-time"
              type="time"
              disabled={!form.date}
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending || !form.title.trim()}>
            {create.isPending ? "Criando…" : "Criar tarefa"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function LeadTasks({
  links,
  owner,
  onOpenCountChange,
}: {
  links: LeadLinks;
  owner?: UserRef | null;
  onOpenCountChange?: (count: number) => void;
}) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [allOpen, setAllOpen] = React.useState(false);
  const queryParams = {
    dealId: links.dealId,
    contactId: links.dealId ? undefined : links.contactId,
    pageSize: 100,
  };
  const tasksQuery = useQuery({
    queryKey: queryKeys.tasks.list(queryParams),
    queryFn: () => tasksApi.list(queryParams),
    enabled: Boolean(links.dealId || links.contactId),
    staleTime: 30_000,
  });
  const statusesQuery = useQuery({
    queryKey: queryKeys.tasks.statuses,
    queryFn: () => tasksApi.statuses(),
    staleTime: 300_000,
  });
  const usersQuery = useQuery({
    queryKey: links.pipelineId
      ? queryKeys.pipelines.eligibleUsers(links.pipelineId)
      : [...queryKeys.settings, "users"],
    queryFn: () =>
      links.pipelineId ? pipelinesApi.eligibleUsers(links.pipelineId) : settingsApi.users(),
    staleTime: 300_000,
  });
  const tasks = tasksQuery.data?.data ?? [];
  const openTasks = sortLeadTasks(tasks.filter((task) => !isTaskDone(task)));
  const doneTasks = sortLeadTasks(tasks.filter(isTaskDone));
  React.useEffect(
    () => onOpenCountChange?.(openTasks.length),
    [onOpenCountChange, openTasks.length],
  );
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
    if (links.dealId)
      void queryClient.invalidateQueries({ queryKey: queryKeys.deals.history(links.dealId) });
  };
  const statusMutation = useMutation({
    mutationFn: ({ id, statusDefinitionId }: { id: string; statusDefinitionId: string }) =>
      tasksApi.update(id, { statusDefinitionId }),
    onMutate: async ({ id, statusDefinitionId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list(queryParams) });
      const previous = queryClient.getQueryData(queryKeys.tasks.list(queryParams));
      const status = statusesQuery.data?.find(
        ({ id: statusId }) => statusId === statusDefinitionId,
      );
      queryClient.setQueryData(queryKeys.tasks.list(queryParams), (old: typeof tasksQuery.data) =>
        old
          ? {
              ...old,
              data: old.data.map((task) =>
                task.id === id
                  ? {
                      ...task,
                      statusDefinitionId,
                      statusDefinition: status,
                      status:
                        status?.category === "DONE"
                          ? "COMPLETED"
                          : status?.category === "IN_PROGRESS"
                            ? "IN_PROGRESS"
                            : "PENDING",
                    }
                  : task,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _vars, context) =>
      queryClient.setQueryData(queryKeys.tasks.list(queryParams), context?.previous),
    onSettled: refresh,
  });
  if (tasksQuery.isLoading) return <Skeleton className="h-20 w-full" />;
  const statuses = statusesQuery.data ?? [];
  return (
    <div className="space-y-2" data-testid="lead-tasks-manager">
      {openTasks.length ? (
        <ul>
          {openTasks.slice(0, 3).map((task) => (
            <li key={task.id}>
              <TaskRow
                task={task}
                statuses={statuses}
                pending={statusMutation.isPending && statusMutation.variables?.id === task.id}
                onStatus={(selectedTask, status) =>
                  statusMutation.mutate({ id: selectedTask.id, statusDefinitionId: status.id })
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhuma tarefa aberta.</p>
      )}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        onClick={() => setCreateOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Nova tarefa
      </button>
      <div>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setAllOpen(true)}
        >
          Ver todas as tarefas
        </button>
      </div>
      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        links={links}
        owner={owner}
        statuses={statuses}
        users={usersQuery.data ?? []}
        onCreated={refresh}
      />
      <Dialog
        open={allOpen}
        onOpenChange={setAllOpen}
        title="Tarefas do lead"
        description="Abertas e concluídas vinculadas a este lead."
        wide
      >
        <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
          <section>
            <h3 className="mb-2 text-sm font-semibold">Abertas ({openTasks.length})</h3>
            {openTasks.length ? (
              <ul>
                {openTasks.map((task) => (
                  <FullTaskRow
                    key={task.id}
                    task={task}
                    statuses={statuses}
                    pending={statusMutation.isPending && statusMutation.variables?.id === task.id}
                    onStatus={(selectedTask, status) =>
                      statusMutation.mutate({ id: selectedTask.id, statusDefinitionId: status.id })
                    }
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa aberta.</p>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-sm font-semibold">Concluídas ({doneTasks.length})</h3>
            {doneTasks.length ? (
              <ul>
                {doneTasks.map((task) => (
                  <FullTaskRow
                    key={task.id}
                    task={task}
                    statuses={statuses}
                    pending={statusMutation.isPending && statusMutation.variables?.id === task.id}
                    onStatus={(selectedTask, status) =>
                      statusMutation.mutate({ id: selectedTask.id, statusDefinitionId: status.id })
                    }
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma tarefa concluída.</p>
            )}
          </section>
        </div>
      </Dialog>
    </div>
  );
}
