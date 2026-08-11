"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import { activitiesApi, contactsApi, conversationsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ConversationContext } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatPrimaryPhoneForDisplay, resolvePrimaryPhone } from "@/lib/format-phone-display";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationChannelBadge } from "./conversation-channel-badge";
import { conversationContactDisplayName, formatLeadCode } from "./conversation-list-utils";
import { buildLeadTrackingFields } from "./lead-tracking-utils";
import { LeadTasks } from "./lead-tasks";
import { LeadOrders } from "./lead-orders";
import { LeadNotes } from "./lead-notes";
import { LeadFiles } from "./lead-files";

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

function LazyActivities({
  contactId,
  dealId,
  conversationId,
}: {
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

function LazyOtherDeals({
  contactId,
  currentDealId,
}: {
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
  const [openTasksCount, setOpenTasksCount] = React.useState(context.counts.tasksCount);
  const [ordersCount, setOrdersCount] = React.useState(context.counts.ordersCount);
  const [notesCount, setNotesCount] = React.useState(context.counts.notesCount);
  const [filesCount, setFilesCount] = React.useState(context.counts.filesCount);
  const contactId = context.contact?.id;
  const dealId = context.currentDeal?.id;
  const name = conversationContactDisplayName(context.contact);
  const primaryPhoneRaw = resolvePrimaryPhone(context.contact);
  const phoneDisplay = formatPrimaryPhoneForDisplay(context.contact);
  const stageName = context.stage?.name?.trim() || context.currentDeal?.stageName?.trim() || null;
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

          <p className="text-xs text-muted-foreground" data-testid="lead-context-owner">
            Responsável: {ownerName || "Não atribuído"}
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Negociação">
        {context.currentDeal ? (
          <div className="space-y-2 text-xs" data-testid="lead-context-negotiation">
            {leadCode ? (
              <p className="font-medium" data-testid="lead-context-lead-code">
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
          <p className="text-xs text-muted-foreground">Sem negociação vinculada.</p>
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

      <CollapsibleSection title="Tarefas" count={openTasksCount}>
        <LeadTasks
          links={{
            contactId: context.contact?.id,
            dealId: context.currentDeal?.id,
            pipelineId: context.pipeline?.id ?? context.currentDeal?.pipelineId,
            stageId: context.stage?.id ?? context.currentDeal?.stageId,
          }}
          owner={context.owner}
          onOpenCountChange={setOpenTasksCount}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Pedidos" count={ordersCount}>
        <LeadOrders
          contactId={contactId}
          contactName={name}
          initialCount={context.counts.ordersCount}
          onCountChange={setOrdersCount}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Notas" count={notesCount}>
        <LeadNotes
          links={{
            contactId,
            dealId,
            pipelineId: context.pipeline?.id ?? context.currentDeal?.pipelineId,
            stageId: context.stage?.id ?? context.currentDeal?.stageId,
          }}
          owner={context.owner}
          onCountChange={setNotesCount}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Arquivos" count={filesCount}>
        {dealId ? (
          <LeadFiles dealId={dealId} leadName={name} onCountChange={setFilesCount} />
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
      <div className="border-b border-border px-4 py-3" data-testid="lead-context-panel-header">
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
          <p className="text-sm text-destructive">{(contextQuery.error as Error).message}</p>
        ) : contextQuery.data ? (
          <ContextBody context={contextQuery.data} />
        ) : null}
      </div>
    </aside>
  );
}
