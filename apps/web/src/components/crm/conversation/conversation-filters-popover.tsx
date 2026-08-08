"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter } from "lucide-react";
import {
  pipelineChannelsApi,
  pipelinesApi,
  settingsApi,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cloneConversationFilters,
  countActiveConversationFilterGroups,
  formatFilterBadgeCount,
  normalizeConversationFilters,
  type ConversationAppliedFilters,
  type ConversationPeriodFilter,
  type ConversationReplyFilter,
  type ConversationStateFilter,
} from "./conversation-filter-utils";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="my-3 border-t border-border/70" />;
}

export function ConversationFiltersPopover({
  pipelineId,
  applied,
  onApply,
  onClear,
}: {
  pipelineId?: string;
  applied: ConversationAppliedFilters;
  onApply: (filters: ConversationAppliedFilters) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(() =>
    cloneConversationFilters(applied),
  );
  const [tagSearch, setTagSearch] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    setDraft(cloneConversationFilters(applied));
    setTagSearch("");
    // Sync draft only when the popover opens — not when parent re-renders `applied`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only sync
  }, [open]);

  const channelsQuery = useQuery({
    queryKey: pipelineId
      ? queryKeys.pipelines.channels(pipelineId)
      : ["pipelines", "channels", "none"],
    queryFn: () => pipelineChannelsApi.list(pipelineId!),
    enabled: open && Boolean(pipelineId),
    staleTime: 60_000,
    retry: false,
  });

  const stagesQuery = useQuery({
    queryKey: pipelineId
      ? queryKeys.pipelines.detail(pipelineId)
      : ["pipelines", "detail", "none"],
    queryFn: () => pipelinesApi.get(pipelineId!),
    enabled: open && Boolean(pipelineId),
    staleTime: 60_000,
    retry: false,
  });

  const tagsQuery = useQuery({
    queryKey: [...queryKeys.settings, "tags", "conversation-filters"],
    queryFn: () => settingsApi.tags(),
    enabled: open,
    staleTime: 60_000,
    retry: false,
  });

  const channelOptions = React.useMemo(() => {
    const rows = channelsQuery.data ?? [];
    return rows
      .filter((row) => row.active !== false)
      .map((row) => ({
        id: row.channelId,
        name:
          row.channel?.displayName ||
          row.channel?.name ||
          row.source ||
          row.channelId,
      }))
      .filter((row, index, list) =>
        list.findIndex((item) => item.id === row.id) === index,
      );
  }, [channelsQuery.data]);

  const stageOptions = React.useMemo(() => {
    const stages = stagesQuery.data?.stages ?? [];
    return stages
      .slice()
      .sort(
        (a, b) =>
          (a.position ?? a.order ?? 0) - (b.position ?? b.order ?? 0),
      )
      .filter((stage) => !stage.archived)
      .map((stage) => ({ id: stage.id, name: stage.name }));
  }, [stagesQuery.data?.stages]);

  const tagOptions = React.useMemo(() => {
    const tags = tagsQuery.data ?? [];
    const q = tagSearch.trim().toLowerCase();
    return tags
      .filter((tag) => !q || tag.name.toLowerCase().includes(q))
      .map((tag) => ({ id: tag.id, name: tag.name }));
  }, [tagSearch, tagsQuery.data]);

  const availableChannelIds = channelOptions.map((item) => item.id);
  const activeCount = countActiveConversationFilterGroups(applied, {
    availableChannelIds,
  });
  const draftCount = countActiveConversationFilterGroups(draft, {
    availableChannelIds,
  });
  const badge = formatFilterBadgeCount(activeCount);

  const patchDraft = (patch: Partial<ConversationAppliedFilters>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const toggleId = (
    key: "channelIds" | "stageIds" | "tagIds",
    id: string,
  ) => {
    setDraft((current) => {
      const set = new Set(current[key]);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...current, [key]: Array.from(set) };
    });
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && open) {
      setDraft(cloneConversationFilters(applied));
    }
    setOpen(next);
    if (!next) {
      queueMicrotask(() => triggerRef.current?.focus());
    }
  };

  const handleApply = () => {
    const normalized = normalizeConversationFilters(draft, {
      availableChannelIds,
      availableStageIds: stageOptions.map((item) => item.id),
      availableTagIds: (tagsQuery.data ?? []).map((tag) => tag.id),
    });
    onApply(normalized);
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  };

  const handleClear = () => {
    onClear();
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  };

  const triggerLabel =
    activeCount > 0
      ? `Filtrar conversas, ${activeCount} filtros ativos`
      : "Filtrar conversas";

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      aria-label="Filtrar conversas"
      trigger={
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          size="icon"
          title="Filtrar conversas"
          aria-label={triggerLabel}
          aria-expanded={open}
          aria-haspopup="dialog"
          data-testid="conversation-filters-trigger"
          onClick={() => handleOpenChange(!open)}
          className={cn(
            "relative h-9 w-9 shrink-0 rounded-full border-border transition",
            (open || activeCount > 0) &&
              "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
            !open &&
              activeCount === 0 &&
              "text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary",
          )}
        >
          <Filter className="h-4 w-4" aria-hidden />
          {badge ? (
            <span
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
              aria-hidden
            >
              {badge}
            </span>
          ) : null}
        </Button>
      }
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Filtrar conversas</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Refine as conversas exibidas
            </p>
          </div>
          {draftCount > 0 ? (
            <span className="text-[11px] font-medium text-primary">
              {draftCount} ativos
            </span>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <SectionTitle>Canais</SectionTitle>
        {!pipelineId ? (
          <p className="text-xs text-muted-foreground">
            Nenhum canal disponível.
          </p>
        ) : channelsQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : channelsQuery.error ? (
          <p className="text-xs text-destructive">
            Não foi possível carregar os canais.
          </p>
        ) : channelOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum canal disponível.
          </p>
        ) : channelOptions.length === 1 ? (
          <p className="text-xs text-muted-foreground">
            Canal: {channelOptions[0]!.name}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {channelOptions.map((channel) => (
              <li key={channel.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={draft.channelIds.includes(channel.id)}
                    onChange={() => toggleId("channelIds", channel.id)}
                  />
                  <span className="truncate">{channel.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <Divider />

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="rounded border-input"
            checked={draft.unreadOnly}
            onChange={(event) =>
              patchDraft({ unreadOnly: event.target.checked })
            }
          />
          Somente não lidas
        </label>

        <Divider />

        <SectionTitle>Situação da resposta</SectionTitle>
        <RadioBlock
          name="reply"
          value={draft.reply}
          onChange={(value) =>
            patchDraft({ reply: value as ConversationReplyFilter })
          }
          options={[
            { value: "any", label: "Qualquer situação" },
            { value: "mine", label: "Aguardando minha resposta" },
            { value: "customer", label: "Aguardando resposta do cliente" },
          ]}
        />

        <Divider />

        <SectionTitle>Estado da conversa</SectionTitle>
        <RadioBlock
          name="conversationState"
          value={draft.conversationState}
          onChange={(value) =>
            patchDraft({
              conversationState: value as ConversationStateFilter,
            })
          }
          options={[
            { value: "all", label: "Todas" },
            { value: "open", label: "Abertas" },
            { value: "closed", label: "Encerradas" },
          ]}
        />

        <Divider />

        <SectionTitle>Etapas da esteira</SectionTitle>
        {!pipelineId ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma etapa disponível.
          </p>
        ) : stagesQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : stagesQuery.error ? (
          <p className="text-xs text-destructive">
            Não foi possível carregar as etapas.
          </p>
        ) : stageOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma etapa disponível.
          </p>
        ) : (
          <ul className="max-h-36 space-y-1.5 overflow-y-auto">
            {stageOptions.map((stage) => (
              <li key={stage.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-input"
                    checked={draft.stageIds.includes(stage.id)}
                    onChange={() => toggleId("stageIds", stage.id)}
                  />
                  <span className="truncate">{stage.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <Divider />

        <SectionTitle>Tags</SectionTitle>
        {tagsQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : tagsQuery.error ? (
          <p className="text-xs text-destructive">
            Não foi possível carregar as tags.
          </p>
        ) : (tagsQuery.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma tag cadastrada
          </p>
        ) : (
          <div className="space-y-2">
            {(tagsQuery.data ?? []).length > 8 ? (
              <Input
                aria-label="Buscar tags"
                placeholder="Buscar tags…"
                value={tagSearch}
                onChange={(event) => setTagSearch(event.target.value)}
                className="h-8"
              />
            ) : null}
            <ul className="max-h-36 space-y-1.5 overflow-y-auto">
              {tagOptions.map((tag) => (
                <li key={tag.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="rounded border-input"
                      checked={draft.tagIds.includes(tag.id)}
                      onChange={() => toggleId("tagIds", tag.id)}
                    />
                    <span className="truncate">{tag.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Divider />

        <SectionTitle>Período da última mensagem</SectionTitle>
        <RadioBlock
          name="period"
          value={draft.period}
          onChange={(value) =>
            patchDraft({ period: value as ConversationPeriodFilter })
          }
          options={[
            { value: "any", label: "Qualquer período" },
            { value: "today", label: "Hoje" },
            { value: "7d", label: "Últimos 7 dias" },
            { value: "30d", label: "Últimos 30 dias" },
            { value: "older30", label: "Mais de 30 dias" },
          ]}
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          data-testid="conversation-filters-clear"
        >
          Limpar filtros
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleApply}
          data-testid="conversation-filters-apply"
        >
          Aplicar filtros
        </Button>
      </div>
    </Popover>
  );
}

function RadioBlock({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5" role="radiogroup" aria-label={name}>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
