"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, FileText, Flag, FolderOpen, History, MessageSquare, NotebookPen, ShoppingBag, UserRound, X } from "lucide-react";
import { conversationsApi, dealsApi, pipelinesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatCurrency } from "@/lib/utils";
import { formatPrimaryPhoneForDisplay } from "@/lib/format-phone-display";
import { useUiStore } from "@/stores/ui";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover } from "@/components/ui/popover";
import type { Deal, DealPriority, UserRef } from "@/lib/types";
import { ConversationThread } from "@/components/crm/conversation/conversation-thread";
import { LeadContextPanel } from "@/components/crm/conversation/lead-context-panel";
import { LeadTasks } from "@/components/crm/conversation/lead-tasks";
import { LeadOrders } from "@/components/crm/conversation/lead-orders";
import { LeadNotes } from "@/components/crm/conversation/lead-notes";
import { LeadFiles } from "@/components/crm/conversation/lead-files";
import { LeadHistory } from "@/components/crm/conversation/lead-history";
import { ConversationChannelBadge } from "@/components/crm/conversation/conversation-channel-badge";
import { PipelineStageSelector } from "@/components/crm/conversation/pipeline-stage-selector";
import { conversationContactDisplayName, formatLeadCode } from "@/components/crm/conversation/conversation-list-utils";

const TABS = [
  { id: "conversation", label: "Conversa", icon: MessageSquare },
  { id: "overview", label: "Visão geral", icon: FileText },
  { id: "tasks", label: "Tarefas", icon: Bell },
  { id: "orders", label: "Pedidos", icon: ShoppingBag },
  { id: "notes", label: "Notas", icon: NotebookPen },
  { id: "files", label: "Arquivos", icon: FolderOpen },
  { id: "history", label: "Histórico", icon: History },
] as const;
type WorkspaceTab = (typeof TABS)[number]["id"];

const PRIORITIES: Array<{ id: DealPriority; label: string }> = [
  { id: "LOW", label: "Baixa" }, { id: "MEDIUM", label: "Média" },
  { id: "HIGH", label: "Alta" }, { id: "URGENT", label: "Urgente" },
];

function DealHeaderControls({ deal, conversationId }: { deal: Deal; conversationId?: string }) {
  const queryClient = useQueryClient();
  const [ownerOpen, setOwnerOpen] = React.useState(false);
  const [priorityOpen, setPriorityOpen] = React.useState(false);
  const users = useQuery({ queryKey: queryKeys.pipelines.eligibleUsers(deal.pipelineId), queryFn: () => pipelinesApi.eligibleUsers(deal.pipelineId), staleTime: 300_000 });
  const update = useMutation({
    mutationFn: (patch: { ownerId?: string | null; priority?: DealPriority }) => dealsApi.update(deal.id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.deals.detail(deal.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      if (conversationId) void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.context(conversationId) });
    },
  });
  const ownerOption = (owner: UserRef | null) => <button key={owner?.id ?? "none"} type="button" className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted" onClick={() => { update.mutate({ ownerId: owner?.id ?? null }); setOwnerOpen(false); }}>{owner ? <Avatar name={owner.name} src={owner.avatarUrl} size="sm" /> : <UserRound className="h-4 w-4" />}<span className="min-w-0 flex-1 truncate">{owner?.name ?? "Não atribuído"}</span>{deal.ownerId === owner?.id || (!deal.ownerId && !owner) ? <Check className="h-4 w-4" /> : null}</button>;
  return <>
    <Popover open={ownerOpen} onOpenChange={setOwnerOpen} align="start" contentWidth={260} aria-label="Alterar responsável" contentClassName="rounded-xl" trigger={<button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2 text-xs" onClick={() => setOwnerOpen((value) => !value)} aria-label={`Alterar responsável. Responsável atual: ${deal.owner?.name ?? "não atribuído"}.`}><Avatar name={deal.owner?.name ?? "?"} src={deal.owner?.avatarUrl} size="sm" className="h-5 w-5 text-[8px]" /><span className="max-w-28 truncate">{deal.owner?.name ?? "Não atribuído"}</span></button>}><div className="max-h-64 overflow-y-auto p-2">{ownerOption(null)}{(users.data ?? []).map((user) => ownerOption(user))}</div></Popover>
    <Popover open={priorityOpen} onOpenChange={setPriorityOpen} align="start" contentWidth={190} aria-label="Alterar prioridade" contentClassName="rounded-xl" trigger={<button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs" onClick={() => setPriorityOpen((value) => !value)} aria-label={`Alterar prioridade. Prioridade atual: ${PRIORITIES.find((item) => item.id === deal.priority)?.label ?? "nenhuma"}.`}><Flag className="h-3.5 w-3.5" />{PRIORITIES.find((item) => item.id === deal.priority)?.label ?? "Prioridade"}</button>}><div className="p-2">{PRIORITIES.map((priority) => <button key={priority.id} type="button" className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted" onClick={() => { update.mutate({ priority: priority.id }); setPriorityOpen(false); }}><Flag className="h-4 w-4" /><span className="flex-1">{priority.label}</span>{deal.priority === priority.id ? <Check className="h-4 w-4" /> : null}</button>)}</div></Popover>
  </>;
}

function DealWorkspaceBody({ dealId }: { dealId: string }) {
  const [tab, setTab] = React.useState<WorkspaceTab>("conversation");
  const dealQuery = useQuery({
    queryKey: queryKeys.deals.detail(dealId),
    queryFn: () => dealsApi.get(dealId),
    retry: false,
  });
  const deal = dealQuery.data;
  const linkedConversationQuery = useQuery({
    queryKey: ["conversations", "byDeal", dealId],
    queryFn: () => conversationsApi.byDeal(dealId),
    enabled: Boolean(deal && !deal.conversationId),
    retry: false,
  });
  const conversationId = deal?.conversationId ?? linkedConversationQuery.data?.id;
  const detailQuery = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId ?? ""),
    queryFn: () => conversationsApi.get(conversationId!),
    enabled: Boolean(conversationId),
    retry: false,
  });

  if (dealQuery.isLoading) return <div className="space-y-3 p-5"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-16 w-full" /><Skeleton className="h-72 w-full" /></div>;
  if (!deal) return <EmptyState title="Negócio não encontrado" description={(dealQuery.error as Error)?.message ?? "Não foi possível carregar o lead."} className="m-5" />;

  const contactName = conversationContactDisplayName(detailQuery.data?.contact ?? deal.contact);
  const leadCode = formatLeadCode(detailQuery.data?.deal?.leadSequence ?? deal.leadSequence);
  const phone = formatPrimaryPhoneForDisplay(detailQuery.data?.contact ?? deal.contact);
  const owner = detailQuery.data?.deal?.owner ?? detailQuery.data?.assignee ?? deal.owner;
  const channel = detailQuery.data?.channel ?? deal.channel;
  const stageId = detailQuery.data?.deal?.stageId ?? deal.stageId;
  const stageName = detailQuery.data?.deal?.stage?.name;
  const taskCount = deal.taskSummary?.open ?? 0;
  const links = { dealId: deal.id, contactId: deal.contactId ?? deal.contact?.id, pipelineId: deal.pipelineId, stageId };

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="unified-deal-workspace">
      <header className="shrink-0 border-b border-border bg-card px-5 py-4 pr-14" data-testid="deal-workspace-header">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold" title={contactName}>{contactName}</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {leadCode ?? "Lead sem código"} · {phone}
            </p>
          </div>
          <p className="shrink-0 text-lg font-semibold text-primary">{formatCurrency(deal.value ?? 0, deal.currency)}</p>
        </div>
        <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
          {channel ? <ConversationChannelBadge channel={channel} className="h-7 max-w-[150px] truncate" /> : null}
          <PipelineStageSelector dealId={deal.id} pipelineId={deal.pipelineId} stageId={stageId} stageName={stageName} conversationId={conversationId} className="h-8 min-w-[130px] max-w-[190px]" />
          <DealHeaderControls deal={deal} conversationId={conversationId} />
          <button type="button" className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-xs" onClick={() => setTab("tasks")} aria-label={`Abrir tarefas. ${taskCount} tarefas pendentes.`}>
            <Bell className="h-3.5 w-3.5" />{taskCount}
          </button>
        </div>
      </header>

      <nav className="scrollbar-thin flex shrink-0 gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2" role="tablist" aria-label="Workspace do lead">
        {TABS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium", tab === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><item.icon className="h-3.5 w-3.5" />{item.label}</button>)}
      </nav>

      <main className="min-h-0 flex-1 overflow-hidden" role="tabpanel">
        {tab === "conversation" ? (
          conversationId ? <ConversationThread conversationId={conversationId} detail={detailQuery.data} detailLoading={detailQuery.isLoading} detailError={detailQuery.error} onRetryDetail={() => void detailQuery.refetch()} listQueryKey={queryKeys.conversations.lists} mounted visible hideHeader showContextButton={false} className="h-full min-h-0" /> : <EmptyState title="Sem conversa vinculada" description="O atendimento ficará disponível quando o lead tiver uma conversa." className="m-5" />
        ) : null}
        {tab === "overview" ? conversationId ? <LeadContextPanel conversationId={conversationId} visible className="h-full border-0" /> : <div className="h-full overflow-y-auto p-5"><EmptyState title="Contexto indisponível" description="Este lead ainda não possui conversa vinculada." /></div> : null}
        {tab === "tasks" ? <div className="h-full overflow-y-auto p-5"><LeadTasks links={links} owner={owner} /></div> : null}
        {tab === "orders" ? <div className="h-full overflow-y-auto p-5"><LeadOrders contactId={links.contactId} contactName={contactName} initialCount={0} /></div> : null}
        {tab === "notes" ? <div className="h-full overflow-y-auto p-5"><LeadNotes links={links} owner={owner} /></div> : null}
        {tab === "files" ? <div className="h-full overflow-y-auto p-5"><LeadFiles dealId={deal.id} leadName={contactName} /></div> : null}
        {tab === "history" ? <div className="h-full overflow-y-auto p-5"><LeadHistory dealId={deal.id} leadName={contactName} /></div> : null}
      </main>
    </div>
  );
}

export function DealWorkspaceDrawer({ onClose: onCloseProp }: { onClose?: () => void } = {}) {
  const open = useUiStore((state) => state.dealDrawerOpen);
  const dealId = useUiStore((state) => state.selectedDealId);
  const closeStore = useUiStore((state) => state.closeDealDrawer);
  const close = React.useCallback(() => { closeStore(); onCloseProp?.(); }, [closeStore, onCloseProp]);
  React.useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector('[role="dialog"]')) close(); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [close, open]);
  if (!open || !dealId) return null;
  return <div className="fixed inset-0 z-50 hidden md:flex" data-testid="deal-workspace-drawer"><button type="button" className="absolute inset-0 bg-foreground/25 backdrop-blur-[1px]" aria-label="Fechar workspace" onClick={close} /><aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-border bg-card shadow-drawer xl:max-w-3xl"><div className="absolute right-3 top-3 z-10"><Button variant="ghost" size="icon" onClick={close} aria-label="Fechar drawer"><X className="h-4 w-4" /></Button></div><DealWorkspaceBody dealId={dealId} /></aside></div>;
}

export function DealWorkspacePage({ dealId }: { dealId: string }) {
  return <div className="mx-auto h-[calc(100dvh-8rem)] max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-card"><DealWorkspaceBody dealId={dealId} /></div>;
}
