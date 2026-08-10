"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  activitiesApi,
  contactsApi,
  conversationsApi,
  dealsApi,
  notesApi,
  ordersApi,
  tasksApi,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ConversationContext } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import {
  formatPrimaryPhoneForDisplay,
  resolvePrimaryPhone,
} from "@/lib/format-phone-display";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationChannelBadge } from "./conversation-channel-badge";
import {
  conversationContactDisplayName,
  formatLeadCode,
} from "./conversation-list-utils";
import { buildLeadTrackingFields } from "./lead-tracking-utils";

function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-b border-border/60 last:border-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-1 py-2.5 text-left text-sm font-medium hover:text-foreground"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1">{title}</span>
        {typeof count === "number" ? (
          <Badge variant="outline" className="font-normal">
            {count}
          </Badge>
        ) : null}
      </button>
      {open ? <div className="pb-3 pl-6 pr-1">{children}</div> : null}
    </div>
  );
}

function LazyNotes({ contactId, dealId }: { contactId?: string; dealId?: string }) {
  const query = useQuery({
    queryKey: queryKeys.notes("conversation", `${contactId ?? ""}-${dealId ?? ""}`),
    queryFn: () =>
      notesApi.list({
        contactId: contactId || undefined,
        dealId: dealId || undefined,
      }),
    enabled: Boolean(contactId || dealId),
  });
  if (query.isLoading) return <Skeleton className="h-8 w-full" />;
  if (!query.data?.length) {
    return (
      <Link
        href={contactId ? `/contacts/${contactId}` : "#"}
        className="text-xs text-primary hover:underline"
      >
        Abrir ficha
      </Link>
    );
  }
  return (
    <ul className="space-y-2 text-xs text-muted-foreground">
      {query.data.slice(0, 5).map((note) => (
        <li key={note.id} className="rounded-md bg-muted/50 p-2">
          {note.content ?? note.body}
        </li>
      ))}
    </ul>
  );
}

function LazyTasks({
  contactId,
  dealId,
  pipelineId,
  stageId,
}: {
  contactId?: string;
  dealId?: string;
  pipelineId?: string;
  stageId?: string;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = React.useState("");
  const query = useQuery({
    queryKey: queryKeys.tasks.list({ contactId, dealId, pageSize: 8 }),
    queryFn: () =>
      tasksApi.list({
        contactId: contactId || undefined,
        dealId: dealId || undefined,
        pageSize: 8,
      }),
    enabled: Boolean(contactId || dealId),
  });

  const create = useMutation({
    mutationFn: () =>
      tasksApi.create({
        title,
        contactId: contactId || undefined,
        dealId: dealId || undefined,
        pipelineId: pipelineId || undefined,
        stageId: stageId || undefined,
      }),
    onSuccess: () => {
      setTitle("");
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },
  });

  const complete = useMutation({
    mutationFn: (id: string) => tasksApi.complete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (query.isLoading) return <Skeleton className="h-8 w-full" />;
  const tasks = query.data?.data ?? [];

  return (
    <div className="space-y-2">
      <form
        className="flex gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          create.mutate();
        }}
      >
        <input
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
          placeholder="Nova tarefa…"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-label="Nova tarefa no lead"
        />
        <Button type="submit" size="sm" disabled={!title.trim() || create.isPending}>
          +
        </Button>
      </form>
      {tasks.length ? (
        <ul className="space-y-2 text-xs">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start justify-between gap-2">
              <span className="min-w-0 flex-1">{task.title}</span>
              {task.status !== "COMPLETED" ? (
                <button
                  type="button"
                  className="shrink-0 text-[10px] text-primary hover:underline"
                  onClick={() => complete.mutate(task.id)}
                >
                  Concluir
                </button>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  OK
                </Badge>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Sem tarefas.</p>
      )}
      <Link href="/tasks" className="text-xs text-primary hover:underline">
        Abrir lista completa
      </Link>
    </div>
  );
}

function LazyOrders({ contactId, dealId }: { contactId?: string; dealId?: string }) {
  const query = useQuery({
    queryKey: queryKeys.orders.list({ contactId, dealId }),
    queryFn: () =>
      ordersApi.list({
        contactId: contactId || undefined,
        dealId: dealId || undefined,
        pageSize: 5,
      }),
    enabled: Boolean(contactId || dealId),
  });
  if (query.isLoading) return <Skeleton className="h-8 w-full" />;
  const orders = query.data?.data ?? [];
  if (!orders.length) {
    return (
      <Link href="/orders" className="text-xs text-primary hover:underline">
        Abrir pedidos
      </Link>
    );
  }
  return (
    <ul className="space-y-2 text-xs">
      {orders.map((order) => (
        <li key={order.id}>
          <Link href={`/orders/${order.id}`} className="hover:text-primary">
            #{order.number} · {order.status}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function LazyActivities({ contactId, dealId, conversationId }: {
  contactId?: string;
  dealId?: string;
  conversationId: string;
}) {
  const query = useQuery({
    queryKey: ["activities", "conversation", conversationId],
    queryFn: () =>
      activitiesApi.list({
        contactId: contactId || undefined,
        dealId: dealId || undefined,
      }),
    enabled: Boolean(contactId || dealId),
  });
  if (query.isLoading) return <Skeleton className="h-8 w-full" />;
  if (!query.data?.length) {
    return <p className="text-xs text-muted-foreground">Sem histórico recente.</p>;
  }
  return (
    <ul className="space-y-2 text-xs text-muted-foreground">
      {query.data.slice(0, 8).map((activity) => (
        <li key={activity.id}>
          <p className="font-medium text-foreground">{activity.title}</p>
          <ClientRelativeTime value={activity.createdAt} />
        </li>
      ))}
    </ul>
  );
}

function LazyOtherDeals({ contactId, currentDealId }: {
  contactId?: string;
  currentDealId?: string;
}) {
  const query = useQuery({
    queryKey: queryKeys.contacts.deals(contactId ?? ""),
    queryFn: () => contactsApi.deals(contactId!),
    enabled: Boolean(contactId),
  });
  if (query.isLoading) return <Skeleton className="h-8 w-full" />;
  const deals = (query.data ?? []).filter((deal) => deal.id !== currentDealId);
  if (!deals.length) {
    return <p className="text-xs text-muted-foreground">Nenhuma outra negociação.</p>;
  }
  return (
    <ul className="space-y-2 text-xs">
      {deals.slice(0, 5).map((deal) => (
        <li key={deal.id}>
          <Link
            href={`/pipelines/${deal.pipelineId}?deal=${deal.id}`}
            className="hover:text-primary"
          >
            {deal.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ContextBody({ context }: { context: ConversationContext }) {
  const contactId = context.contact?.id;
  const dealId = context.currentDeal?.id;
  const name = conversationContactDisplayName(context.contact);
  const primaryPhoneRaw = resolvePrimaryPhone(context.contact);
  const phoneDisplay = formatPrimaryPhoneForDisplay(context.contact);
  const stageName =
    context.stage?.name?.trim() ||
    context.currentDeal?.stageName?.trim() ||
    null;
  const hasDeal = Boolean(context.currentDeal);
  const ownerName = context.owner?.name?.trim() || null;
  const leadCode = formatLeadCode(context.currentDeal?.leadSequence);
  const pipelineName = context.pipeline?.name?.trim() || null;

  return (
    <div className="space-y-1">
      <CollapsibleSection title="Resumo" defaultOpen>
        <div className="space-y-2 text-sm" data-testid="lead-context-summary">
          <div className="flex items-center gap-2">
            <Avatar name={name} />
            <div className="min-w-0">
              <p
                className="truncate font-medium"
                data-testid="lead-context-contact-name"
                title={name}
              >
                {name}
              </p>
              <p
                className="truncate text-xs text-muted-foreground"
                data-testid="lead-context-phone"
                title={primaryPhoneRaw ?? undefined}
              >
                {phoneDisplay}
              </p>
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5"
            data-testid="lead-context-summary-badges"
          >
            {context.channel ? (
              <ConversationChannelBadge
                channel={context.channel}
                className="h-5 max-w-full truncate px-1.5 py-0 text-[10px]"
                data-testid="lead-context-channel-badge"
              />
            ) : (
              <Badge
                variant="outline"
                className="h-5 px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                data-testid="lead-context-channel-badge"
              >
                Canal não informado
              </Badge>
            )}
            {hasDeal ? (
              <Badge
                variant="outline"
                className="h-5 max-w-full truncate px-1.5 py-0 text-[10px] font-normal"
                title={stageName ?? "Sem etapa"}
                data-testid="lead-context-stage-badge"
              >
                {stageName || "Sem etapa"}
              </Badge>
            ) : null}
          </div>

          <p
            className="text-xs text-muted-foreground"
            data-testid="lead-context-owner"
          >
            Responsável: {ownerName || "Não atribuído"}
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Negociação">
        {context.currentDeal ? (
          <div
            className="space-y-2 text-xs"
            data-testid="lead-context-negotiation"
          >
            {leadCode ? (
              <p
                className="font-medium"
                data-testid="lead-context-lead-code"
              >
                {leadCode}
              </p>
            ) : null}
            <div className="space-y-1 text-muted-foreground">
              <p className="break-words" data-testid="lead-context-pipeline">
                Pipeline: {pipelineName || "Não informado"}
              </p>
              <p className="break-words" data-testid="lead-context-stage">
                Etapa: {stageName || "Sem etapa"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Sem negociação vinculada.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Rastreamento">
        <div className="space-y-2.5" data-testid="lead-context-tracking">
          {buildLeadTrackingFields({
            channel: context.channel,
            tracking: context.tracking,
          }).map((field) => (
            <div key={`${field.label}-${field.value}`} className="min-w-0">
              <p className="text-[11px] text-muted-foreground">{field.label}</p>
              <p
                className={
                  field.truncate
                    ? "truncate break-all text-xs font-medium"
                    : "break-words text-xs font-medium"
                }
                title={field.truncate ? field.value : undefined}
                data-testid={field.testId}
              >
                {field.value}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Tarefas" count={context.counts.tasksCount}>
        {context.nextTask ? (
          <p className="mb-2 text-xs text-muted-foreground">
            Próxima: {context.nextTask.title}
            {context.nextTask.dueAt
              ? ` · ${formatDate(context.nextTask.dueAt, "dd/MM")}`
              : ""}
          </p>
        ) : null}
        <LazyTasks
          contactId={context.contact?.id}
          dealId={context.currentDeal?.id}
          pipelineId={context.pipeline?.id ?? context.currentDeal?.pipelineId}
          stageId={context.stage?.id ?? context.currentDeal?.stageId}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Pedidos" count={context.counts.ordersCount}>
        {context.lastOrder ? (
          <p className="mb-2 text-xs text-muted-foreground">
            Último: #{context.lastOrder.number} · {context.lastOrder.status}
          </p>
        ) : null}
        <LazyOrders contactId={contactId} dealId={dealId} />
      </CollapsibleSection>

      <CollapsibleSection title="Notas" count={context.counts.notesCount}>
        <LazyNotes contactId={contactId} dealId={dealId} />
      </CollapsibleSection>

      <CollapsibleSection title="Arquivos" count={context.counts.filesCount}>
        {dealId ? (
          <LazyDealFiles dealId={dealId} count={context.counts.filesCount} />
        ) : (
          <p className="text-xs text-muted-foreground">
            {context.counts.filesCount
              ? `${context.counts.filesCount} arquivo(s) na conversa`
              : "Sem arquivos."}
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Histórico" count={context.counts.activitiesCount}>
        <LazyActivities
          contactId={contactId}
          dealId={dealId}
          conversationId={context.conversation.id}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Outras negociações">
        <LazyOtherDeals contactId={contactId} currentDealId={dealId} />
      </CollapsibleSection>
    </div>
  );
}

function LazyDealFiles({ dealId, count }: { dealId: string; count: number }) {
  const query = useQuery({
    queryKey: queryKeys.deals.files(dealId),
    queryFn: () => dealsApi.files(dealId),
  });
  if (query.isLoading) return <Skeleton className="h-8 w-full" />;
  if (!query.data?.length) {
    return (
      <p className="text-xs text-muted-foreground">
        {count ? `${count} anexo(s) na conversa` : "Sem arquivos."}
      </p>
    );
  }
  return (
    <ul className="space-y-1 text-xs">
      {query.data.map((file) => (
        <li key={file.id}>
          <a href={file.url} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            {file.name}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function LeadContextPanel({
  conversationId,
  visible,
  className,
}: {
  conversationId?: string;
  visible: boolean;
  className?: string;
}) {
  const contextQuery = useQuery({
    queryKey: queryKeys.conversations.context(conversationId ?? ""),
    queryFn: () => conversationsApi.context(conversationId!),
    enabled: Boolean(conversationId),
    staleTime: 30_000,
  });

  return (
    <aside
      data-testid="lead-context-panel"
      className={cn(
        "min-h-0 flex-col overflow-hidden border-border bg-card",
        visible ? "flex" : "hidden lg:flex",
        className,
      )}
    >
      <div
        className="border-b border-border px-4 py-3"
        data-testid="lead-context-panel-header"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contexto do lead
        </p>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {!conversationId ? (
          <p className="text-sm text-muted-foreground">
            Selecione uma conversa para ver o contexto.
          </p>
        ) : contextQuery.isLoading ? (
          <div className="space-y-3" aria-label="Carregando contexto">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : contextQuery.error ? (
          <p className="text-sm text-destructive">
            {(contextQuery.error as Error).message}
          </p>
        ) : contextQuery.data ? (
          <ContextBody context={contextQuery.data} />
        ) : null}
      </div>
    </aside>
  );
}
