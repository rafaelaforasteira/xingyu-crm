"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { contactsApi, conversationsApi, dealsApi, settingsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ConversationContext, Tag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatPrimaryPhoneForDisplay, resolvePrimaryPhone } from "@/lib/format-phone-display";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover } from "@/components/ui/popover";
import { ConversationChannelBadge } from "./conversation-channel-badge";
import { conversationContactDisplayName, formatLeadCode } from "./conversation-list-utils";
import { buildLeadTrackingFields } from "./lead-tracking-utils";
import { LeadTasks } from "./lead-tasks";
import { LeadOrders } from "./lead-orders";
import { LeadNotes } from "./lead-notes";
import { LeadFiles } from "./lead-files";
import { LeadHistory } from "./lead-history";
import {
  ALL_SECTIONS_OPEN,
  mergeStoredSectionState,
  toggleContextSection,
  type ContextSectionId,
  type ContextSectionsState,
} from "./lead-context-sections";

function CollapsibleSection({
  sectionId,
  title,
  count,
  open,
  onToggle,
  children,
}: {
  sectionId: ContextSectionId;
  title: string;
  count?: number;
  open: boolean;
  onToggle: (sectionId: ContextSectionId) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border/60 last:border-0" data-context-section={sectionId}>
      <button
        type="button"
        className="flex w-full items-center gap-2 px-1 py-2.5 text-left text-sm font-medium hover:text-foreground"
        onClick={() => onToggle(sectionId)}
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
    </section>
  );
}

const SECTIONS_STORAGE_KEY = "leadContextSectionsState";

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

function LeadTrackingTags({ context }: { context: ConversationContext }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const contactId = context.contact?.id;
  const dealId = context.currentDeal?.id;
  const contextKey = queryKeys.conversations.context(context.conversation.id);
  const tagsQuery = useQuery({
    queryKey: [...queryKeys.settings, "tags"],
    queryFn: settingsApi.tags,
    staleTime: 300_000,
  });
  const syncCaches = () => {
    void queryClient.invalidateQueries({ queryKey: contextKey });
    void queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists });
  };
  const tagMutation = useMutation({
    mutationFn: async ({ tag, mode }: { tag: Tag; mode: "add" | "remove" }) => {
      if (!contactId && !dealId)
        throw new Error("Este lead nÃ£o possui entidade para classificar.");
      if (mode === "add") {
        if (dealId) return dealsApi.addTag(dealId, tag.id);
        return contactsApi.updateTags(contactId!, [tag.id], "add");
      }
      const operations: Promise<unknown>[] = [];
      if (dealId && context.tagSources?.dealTagIds.includes(tag.id))
        operations.push(dealsApi.removeTag(dealId, tag.id));
      if (contactId && context.tagSources?.contactTagIds.includes(tag.id))
        operations.push(contactsApi.updateTags(contactId, [tag.id], "remove"));
      return Promise.all(operations);
    },
    onMutate: async ({ tag, mode }) => {
      await queryClient.cancelQueries({ queryKey: contextKey });
      const previous = queryClient.getQueryData<ConversationContext>(contextKey);
      queryClient.setQueryData<ConversationContext>(contextKey, (current) =>
        current
          ? {
              ...current,
              tags:
                mode === "add"
                  ? current.tags.some((item) => item.id === tag.id)
                    ? current.tags
                    : [...current.tags, tag]
                  : current.tags.filter((item) => item.id !== tag.id),
              tagSources: {
                contactTagIds:
                  mode === "remove"
                    ? (current.tagSources?.contactTagIds ?? []).filter((id) => id !== tag.id)
                    : (current.tagSources?.contactTagIds ?? []),
                dealTagIds:
                  mode === "add" && dealId
                    ? [...new Set([...(current.tagSources?.dealTagIds ?? []), tag.id])]
                    : mode === "remove"
                      ? (current.tagSources?.dealTagIds ?? []).filter((id) => id !== tag.id)
                      : (current.tagSources?.dealTagIds ?? []),
              },
            }
          : current,
      );
      return { previous };
    },
    onError: (error: Error, _variables, rollback) => {
      queryClient.setQueryData(contextKey, rollback?.previous);
      toast.error(error.message || "NÃ£o foi possÃ­vel atualizar a tag");
    },
    onSettled: syncCaches,
  });
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!contactId && !dealId)
        throw new Error("Este lead nÃ£o possui entidade para classificar.");
      const tag = await settingsApi.createTag({ name: name.trim() });
      if (dealId) await dealsApi.addTag(dealId, tag.id);
      else await contactsApi.updateTags(contactId!, [tag.id], "add");
      return tag;
    },
    onSuccess: (tag) => {
      queryClient.setQueryData<ConversationContext>(contextKey, (current) =>
        current && !current.tags.some((item) => item.id === tag.id)
          ? {
              ...current,
              tags: [...current.tags, tag],
              tagSources: {
                contactTagIds: !dealId
                  ? [...new Set([...(current.tagSources?.contactTagIds ?? []), tag.id])]
                  : (current.tagSources?.contactTagIds ?? []),
                dealTagIds: dealId
                  ? [...new Set([...(current.tagSources?.dealTagIds ?? []), tag.id])]
                  : (current.tagSources?.dealTagIds ?? []),
              },
            }
          : current,
      );
      setNewName("");
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.settings, "tags"] });
      syncCaches();
      toast.success("Tag criada e adicionada");
    },
    onError: (error: Error) => toast.error(error.message || "NÃ£o foi possÃ­vel criar a tag"),
  });
  const selectedIds = new Set(context.tags.map((tag) => tag.id));
  const available = (tagsQuery.data ?? []).filter((tag) =>
    tag.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")),
  );
  return (
    <div className="mt-3 border-t border-border/50 pt-3" data-testid="lead-context-tags-block">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">Tags</p>
        <Popover
          open={open}
          onOpenChange={setOpen}
          aria-label="Gerenciar tags do lead"
          contentClassName="w-72 rounded-xl"
          trigger={
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setOpen((value) => !value)}
              aria-label="Adicionar tag"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar tag
            </button>
          }
        >
          <div className="p-3">
            <p className="mb-2 text-sm font-semibold">Tags</p>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar tag..."
              className="mb-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              aria-label="Buscar tag"
            />
            <div className="max-h-52 space-y-1 overflow-y-auto">
              {available.map((tag) => {
                const selected = selectedIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => tagMutation.mutate({ tag, mode: selected ? "remove" : "add" })}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: tag.color || "hsl(var(--primary))" }}
                    />
                    <span className="min-w-0 flex-1 truncate" title={tag.name}>
                      {tag.name}
                    </span>
                    {selected ? (
                      <Check className="h-4 w-4 text-primary" aria-label="Selecionada" />
                    ) : null}
                  </button>
                );
              })}
              {!available.length ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">Nenhuma tag encontrada.</p>
              ) : null}
            </div>
            <div className="mt-3 border-t border-border pt-3">
              <p className="mb-1.5 text-xs font-medium">Criar nova tag</p>
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Nome da tag"
                  aria-label="Nome da nova tag"
                  maxLength={80}
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                />
                <button
                  type="button"
                  className="h-9 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50"
                  disabled={!newName.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate(newName)}
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        </Popover>
      </div>
      {context.tags.length ? (
        <div className="flex flex-wrap gap-1.5">
          {context.tags.map((tag) => (
            <span
              key={tag.id}
              className="group inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-border bg-muted/60 px-2 text-[10px] text-foreground"
              title={tag.name}
            >
              <span className="max-w-[10rem] truncate">{tag.name}</span>
              <button
                type="button"
                className="-mr-1 rounded-sm opacity-40 hover:opacity-100 focus:opacity-100"
                onClick={() => tagMutation.mutate({ tag, mode: "remove" })}
                aria-label={`Remover tag ${tag.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhuma tag adicionada.</p>
      )}
    </div>
  );
}

function ContextBody({
  context,
  sections,
  onToggle,
}: {
  context: ConversationContext;
  sections: ContextSectionsState;
  onToggle: (id: ContextSectionId) => void;
}) {
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
      <CollapsibleSection
        sectionId="summary"
        title="Resumo"
        open={sections.summary}
        onToggle={onToggle}
      >
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

      <CollapsibleSection
        sectionId="negotiation"
        title="Negociação"
        open={sections.negotiation}
        onToggle={onToggle}
      >
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

      <CollapsibleSection
        sectionId="tracking"
        title="Rastreamento"
        open={sections.tracking}
        onToggle={onToggle}
      >
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
          <LeadTrackingTags context={context} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="tasks"
        title="Tarefas"
        count={openTasksCount}
        open={sections.tasks}
        onToggle={onToggle}
      >
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

      <CollapsibleSection
        sectionId="orders"
        title="Pedidos"
        count={ordersCount}
        open={sections.orders}
        onToggle={onToggle}
      >
        <LeadOrders
          contactId={contactId}
          contactName={name}
          initialCount={context.counts.ordersCount}
          onCountChange={setOrdersCount}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="notes"
        title="Notas"
        count={notesCount}
        open={sections.notes}
        onToggle={onToggle}
      >
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

      <CollapsibleSection
        sectionId="files"
        title="Arquivos"
        count={filesCount}
        open={sections.files}
        onToggle={onToggle}
      >
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

      <CollapsibleSection
        sectionId="history"
        title="Histórico"
        open={sections.history}
        onToggle={onToggle}
      >
        {dealId ? (
          <LeadHistory dealId={dealId} leadName={name} />
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum acontecimento registrado.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        sectionId="otherDeals"
        title="Outras negociações"
        open={sections.otherDeals}
        onToggle={onToggle}
      >
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
  const [sections, setSections] = React.useState<ContextSectionsState>(ALL_SECTIONS_OPEN);
  const [sectionsReady, setSectionsReady] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(SECTIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ContextSectionsState>;
        setSections(mergeStoredSectionState(parsed));
      }
    } catch {
      // Invalid session data falls back to the product default: every section open.
    } finally {
      setSectionsReady(true);
    }
  }, []);

  React.useEffect(() => {
    if (!sectionsReady) return;
    window.sessionStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(sections));
  }, [sections, sectionsReady]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [conversationId]);

  const toggleSection = React.useCallback((sectionId: ContextSectionId) => {
    setSections((current) => toggleContextSection(current, sectionId));
  }, []);

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
        "h-full min-h-0 flex-col overflow-hidden border-border bg-card",
        visible ? "flex" : "hidden lg:flex",
        className,
      )}
    >
      <div
        className="shrink-0 border-b border-border bg-card px-4 py-3"
        data-testid="lead-context-panel-header"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Contexto do lead
        </p>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable]"
        data-testid="lead-context-scroll"
      >
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
          <ContextBody context={contextQuery.data} sections={sections} onToggle={toggleSection} />
        ) : null}
      </div>
    </aside>
  );
}
