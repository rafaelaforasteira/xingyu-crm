"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckSquare,
  FileText,
  History,
  MessageSquare,
  Paperclip,
  Send,
  StickyNote,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  conversationsApi,
  dealsApi,
  notesApi,
  ordersApi,
  tasksApi,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Deal, Message, Task } from "@/lib/types";
import { cn, formatCurrency, formatTaskDue } from "@/lib/utils";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { useUiStore } from "@/stores/ui";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label, Select } from "@/components/ui/form-controls";

function DealTasksPanel({
  dealId,
  contactId,
  pipelineId,
  stageId,
  tasks,
}: {
  dealId: string;
  contactId?: string | null;
  pipelineId?: string | null;
  stageId?: string | null;
  tasks: Task[];
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = React.useState("");

  const create = useMutation({
    mutationFn: () =>
      tasksApi.create({
        title,
        dealId,
        contactId: contactId || undefined,
        pipelineId: pipelineId || undefined,
        stageId: stageId || undefined,
      }),
    onSuccess: () => {
      setTitle("");
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa criada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const complete = useMutation({
    mutationFn: (id: string) => tasksApi.complete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Tarefa concluída");
    },
  });

  return (
    <div className="space-y-3" data-testid="deal-tasks-panel">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          create.mutate();
        }}
      >
        <Input
          placeholder="Nova tarefa neste card…"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Nova tarefa do deal"
        />
        <Button type="submit" disabled={!title.trim() || create.isPending}>
          Criar
        </Button>
      </form>
      {tasks.length === 0 ? (
        <EmptyState title="Sem tarefas" description="Crie a primeira tarefa deste card." />
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatTaskDue(task.dueAt)}
                {task.stage?.name ? ` · ${task.stage.name}` : ""}
              </p>
            </div>
            {task.status !== "COMPLETED" ? (
              <Button size="sm" variant="ghost" onClick={() => complete.mutate(task.id)}>
                Concluir
              </Button>
            ) : (
              <Badge variant="secondary">Concluída</Badge>
            )}
          </div>
        ))
      )}
    </div>
  );
}

const TABS = [
  { id: "conversa", label: "Conversa", icon: MessageSquare },
  { id: "resumo", label: "Resumo", icon: FileText },
  { id: "tarefas", label: "Tarefas", icon: CheckSquare },
  { id: "pedidos", label: "Pedidos", icon: StickyNote },
  { id: "historico", label: "Histórico", icon: History },
  { id: "arquivos", label: "Arquivos", icon: Paperclip },
] as const;

function MessageBubble({ message }: { message: Message }) {
  const outbound = message.direction === "OUTBOUND";
  const internal = message.direction === "INTERNAL";
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
          internal
            ? "bg-warning/15 text-foreground"
            : outbound
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
        )}
      >
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            outbound && !internal ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {format(new Date(message.createdAt), "dd/MM HH:mm", { locale: ptBR })}
          {message.author?.name ? ` · ${message.author.name}` : ""}
        </p>
      </div>
    </div>
  );
}

function ConversationPane({ deal }: { deal: Deal }) {
  const queryClient = useQueryClient();
  const [body, setBody] = React.useState("");
  const [note, setNote] = React.useState("");
  const [taskTitle, setTaskTitle] = React.useState("");
  const [showNote, setShowNote] = React.useState(false);
  const [showTask, setShowTask] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const conversationId = deal.conversationId;

  const { data: conversation } = useQuery({
    queryKey: ["conversations", "byDeal", deal.id],
    queryFn: () => conversationsApi.byDeal(deal.id),
    enabled: !conversationId,
    retry: false,
  });

  const resolvedId = conversationId ?? conversation?.id;

  const { data: messagePage, isLoading } = useQuery({
    queryKey: queryKeys.conversations.messages(resolvedId ?? "none"),
    queryFn: () => conversationsApi.messages(resolvedId!),
    enabled: !!resolvedId,
    retry: false,
  });
  const messages = messagePage?.data ?? [];

  const { data: notes = [] } = useQuery({
    queryKey: queryKeys.notes("deal", deal.id),
    queryFn: () => notesApi.list({ dealId: deal.id }),
    retry: false,
  });

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (text: string) => conversationsApi.sendMessage(resolvedId!, text),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(resolvedId!),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noteMutation = useMutation({
    mutationFn: () =>
      notesApi.create({
        content: note,
        dealId: deal.id,
        contactId: deal.contactId ?? undefined,
        isInternal: true,
      }),
    onSuccess: () => {
      setNote("");
      setShowNote(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.notes("deal", deal.id) });
      toast.success("Nota salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const taskMutation = useMutation({
    mutationFn: () =>
      tasksApi.create({
        title: taskTitle,
        dealId: deal.id,
        contactId: deal.contactId ?? undefined,
        status: "PENDING",
        type: "FOLLOW_UP",
      }),
    onSuccess: () => {
      setTaskTitle("");
      setShowTask(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
      toast.success("Tarefa criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {!resolvedId && !isLoading ? (
          <EmptyState
            icon={MessageSquare}
            title="Sem conversa vinculada"
            description="Este negócio ainda não possui uma conversa na API."
            className="border-0 bg-transparent py-10"
          />
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-2/3" />
            <Skeleton className="ml-auto h-16 w-1/2" />
            <Skeleton className="h-12 w-3/5" />
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {notes.length > 0 ? (
          <div className="space-y-2 border-t border-dashed border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notas
            </p>
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg bg-warning/10 px-3 py-2 text-sm">
                <p>{n.body ?? n.content}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {n.author?.name ?? "Equipe"} ·{" "}
                  <ClientRelativeTime value={n.createdAt} />
                </p>
              </div>
            ))}
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={showNote ? "secondary" : "outline"}
            onClick={() => {
              setShowNote((v) => !v);
              setShowTask(false);
            }}
          >
            <StickyNote className="h-3.5 w-3.5" />
            Nota
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showTask ? "secondary" : "outline"}
            onClick={() => {
              setShowTask((v) => !v);
              setShowNote(false);
            }}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Tarefa
          </Button>
        </div>

        {showNote ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Escreva uma nota interna…"
              rows={3}
            />
            <Button
              size="sm"
              disabled={!note.trim() || noteMutation.isPending}
              onClick={() => noteMutation.mutate()}
            >
              Salvar nota
            </Button>
          </div>
        ) : null}

        {showTask ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-2">
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Título da tarefa"
            />
            <Button
              size="sm"
              disabled={!taskTitle.trim() || taskMutation.isPending}
              onClick={() => taskMutation.mutate()}
            >
              Criar tarefa
            </Button>
          </div>
        ) : null}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!body.trim() || !resolvedId) return;
            sendMutation.mutate(body.trim());
          }}
        >
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              resolvedId
                ? "Escreva uma mensagem…"
                : "Conversa indisponível"
            }
            disabled={!resolvedId || sendMutation.isPending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!resolvedId || !body.trim() || sendMutation.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function DealWorkspaceBody({ dealId }: { dealId: string }) {
  const { data: deal, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.deals.detail(dealId),
    queryFn: () => dealsApi.get(dealId),
    retry: false,
  });

  const { data: activities = [] } = useQuery({
    queryKey: queryKeys.deals.activities(dealId),
    queryFn: () => dealsApi.activities(dealId),
    enabled: !!deal,
    retry: false,
  });

  const { data: files = [] } = useQuery({
    queryKey: queryKeys.deals.files(dealId),
    queryFn: () => dealsApi.files(dealId),
    enabled: !!deal,
    retry: false,
  });

  const { data: tasksData } = useQuery({
    queryKey: queryKeys.tasks.list({ dealId }),
    queryFn: () => tasksApi.list({ dealId }),
    enabled: !!deal,
    retry: false,
  });

  const { data: ordersData } = useQuery({
    queryKey: queryKeys.orders.list({ dealId }),
    queryFn: () => ordersApi.list({ dealId }),
    enabled: !!deal,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <EmptyState
        title="Negócio não encontrado"
        description={(error as Error)?.message ?? "Não foi possível carregar o deal."}
        className="m-4"
      />
    );
  }

  const tasks = tasksData?.data ?? [];
  const orders = ordersData?.data ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{deal.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {deal.contact?.name ?? "Sem contato"}
              {deal.company?.name ? ` · ${deal.company.name}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(deal.value ?? 0, deal.currency)}
            </p>
            {deal.owner ? (
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <Avatar name={deal.owner.name} size="sm" />
                <span className="text-xs text-muted-foreground">{deal.owner.name}</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {deal.priority ? <Badge>{deal.priority}</Badge> : null}
          {deal.tags?.map((t) => (
            <Badge key={t.id} variant="outline">
              {t.name}
            </Badge>
          ))}
        </div>
      </div>

      <Tabs defaultValue="conversa" className="flex min-h-0 flex-1 flex-col px-5 py-3">
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              <tab.icon className="mr-1.5 h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="conversa" className="min-h-0 flex-1">
          <div className="h-[calc(100vh-16rem)]">
            <ConversationPane deal={deal} />
          </div>
        </TabsContent>

        <TabsContent value="resumo" className="space-y-3">
          <InfoRow label="Contato" value={deal.contact?.name} />
          <InfoRow label="Empresa" value={deal.company?.name} />
          <InfoRow label="Valor" value={formatCurrency(deal.value ?? 0)} />
          <InfoRow label="Prioridade" value={deal.priority} />
          <InfoRow
            label="Última interação"
            value={<ClientRelativeTime value={deal.lastInteractionAt} />}
          />
          <InfoRow
            label="Próxima tarefa"
            value={
              deal.nextTask
                ? `${deal.nextTask.title} (${formatTaskDue(deal.nextTask.dueAt)})`
                : undefined
            }
          />
        </TabsContent>

        <TabsContent value="tarefas" className="space-y-2">
          <DealTasksPanel
            dealId={deal.id}
            contactId={deal.contactId ?? deal.contact?.id}
            pipelineId={deal.pipelineId}
            stageId={deal.stageId}
            tasks={tasks}
          />
        </TabsContent>

        <TabsContent value="pedidos" className="space-y-2">
          {orders.length === 0 ? (
            <EmptyState title="Sem pedidos" description="Pedidos vinculados aparecerão aqui." />
          ) : (
            orders.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium">#{o.number}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(o.total)}</p>
                </div>
                <Badge>{o.status}</Badge>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-2">
          {activities.length === 0 ? (
            <EmptyState title="Sem histórico" description="Atividades do negócio aparecerão aqui." />
          ) : (
            activities.map((a) => (
              <div key={a.id} className="rounded-lg border border-border px-3 py-2">
                <p className="text-sm font-medium">{a.title}</p>
                {a.description ? (
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  <ClientRelativeTime value={a.createdAt} />
                  {a.actor?.name ? ` · ${a.actor.name}` : ""}
                </p>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="arquivos" className="space-y-2">
          {files.length === 0 ? (
            <EmptyState title="Sem arquivos" description="Anexos do negócio aparecerão aqui." />
          ) : (
            files.map((f) => (
              <a
                key={f.id}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-accent"
              >
                <Paperclip className="h-4 w-4 text-primary" />
                <span className="text-sm">{f.fileName}</span>
              </a>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}

export function DealWorkspaceDrawer({
  onClose: onCloseProp,
}: {
  onClose?: () => void;
} = {}) {
  const open = useUiStore((s) => s.dealDrawerOpen);
  const dealId = useUiStore((s) => s.selectedDealId);
  const closeStore = useUiStore((s) => s.closeDealDrawer);
  const close = React.useCallback(() => {
    closeStore();
    onCloseProp?.();
  }, [closeStore, onCloseProp]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || !dealId) return null;

  return (
    <div className="fixed inset-0 z-50 hidden md:flex" data-testid="deal-workspace-drawer">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]"
        aria-label="Fechar workspace"
        onClick={close}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-border bg-card shadow-drawer xl:max-w-3xl">
        <div className="absolute right-3 top-3 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={close}
            aria-label="Fechar drawer"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <DealWorkspaceBody dealId={dealId} />
      </aside>
    </div>
  );
}

export function DealWorkspacePage({ dealId }: { dealId: string }) {
  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-border bg-card shadow-card">
      <DealWorkspaceBody dealId={dealId} />
    </div>
  );
}

export function CreateTaskInlineForm({
  dealId,
  contactId,
}: {
  dealId?: string;
  contactId?: string;
}) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState("FOLLOW_UP");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      tasksApi.create({ title, type, dealId, contactId, status: "PENDING" }),
    onSuccess: () => {
      setTitle("");
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.list() });
      toast.success("Tarefa criada");
    },
  });

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        mutation.mutate();
      }}
    >
      <div className="min-w-[180px] flex-1 space-y-1">
        <Label>Título</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="w-40 space-y-1">
        <Label>Tipo</Label>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="FOLLOW_UP">Follow-up</option>
          <option value="CALL">Ligação</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="MEETING">Reunião</option>
        </Select>
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        Criar
      </Button>
    </form>
  );
}
