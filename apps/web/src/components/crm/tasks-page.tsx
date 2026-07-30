"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { tasksApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { formatTaskDue } from "@/lib/utils";
import { PageHeader, PaginationBar, ErrorBanner } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/form-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TasksPage() {
  const searchParams = useSearchParams();
  const initialView = searchParams.get("view") === "today" ? "today" : "all";
  const [view, setView] = React.useState(initialView);
  const [page, setPage] = React.useState(1);
  const [status, setStatus] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState("FOLLOW_UP");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (searchParams.get("new") === "1") setOpen(true);
    if (searchParams.get("view") === "today") setView("today");
  }, [searchParams]);

  const list = useQuery({
    queryKey: queryKeys.tasks.list({ page, status, view }),
    queryFn: () =>
      view === "today"
        ? tasksApi.today().then((data) => ({
            data,
            meta: { total: data.length, page: 1, pageSize: data.length || 20, totalPages: 1 },
          }))
        : tasksApi.list({
            page,
            pageSize: 20,
            status: status || undefined,
          }),
    retry: false,
  });

  const create = useMutation({
    mutationFn: () => tasksApi.create({ title, type, status: "PENDING" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa criada");
      setOpen(false);
      setTitle("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const complete = useMutation({
    mutationFn: (id: string) => tasksApi.update(id, { status: "DONE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa concluída");
    },
  });

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description="Agenda operacional da equipe."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        }
      />
      {list.error ? <ErrorBanner message={(list.error as Error).message} /> : null}

      <Tabs defaultValue={initialView} value={view} onValueChange={setView}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="today">Hoje</TabsTrigger>
          </TabsList>
          {view === "all" ? (
            <Select
              className="w-40"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos status</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="DONE">Concluída</option>
            </Select>
          ) : null}
        </div>

        <TabsContent value={view} className="mt-0">
          <div className="space-y-2">
            {list.isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              : null}
            {!list.isLoading && (list.data?.data?.length ?? 0) === 0 ? (
              <EmptyState icon={CheckSquare} title="Nenhuma tarefa" />
            ) : null}
            {list.data?.data?.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-soft"
              >
                <div className="min-w-0">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTaskDue(task.dueAt)}
                    {task.contact?.name ? ` · ${task.contact.name}` : ""}
                    {task.assignee?.name ? ` · ${task.assignee.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {task.type ? <Badge variant="outline">{task.type}</Badge> : null}
                  <Badge variant="secondary">{task.status}</Badge>
                  {task.status !== "DONE" ? (
                    <Button size="sm" variant="outline" onClick={() => complete.mutate(task.id)}>
                      Concluir
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {view === "all" && list.data?.meta ? (
            <PaginationBar
              page={list.data.meta.page}
              totalPages={list.data.meta.totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen} title="Nova tarefa">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="FOLLOW_UP">Follow-up</option>
              <option value="CALL">Ligação</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="MEETING">Reunião</option>
              <option value="AFTER_SALES">Pós-venda</option>
              <option value="REPURCHASE">Recompra</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!title.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              Criar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
