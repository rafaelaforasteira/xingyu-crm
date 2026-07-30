"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ConversationFiltersState {
  search: string;
  channelId: string;
  pipelineId: string;
  unreadOnly: boolean;
}

export function ConversationFilters({
  filters,
  onChange,
  showPipelineFilter,
  channels,
  pipelines,
  className,
}: {
  filters: ConversationFiltersState;
  onChange: (patch: Partial<ConversationFiltersState>) => void;
  showPipelineFilter: boolean;
  channels: { id: string; name: string }[];
  pipelines: { id: string; name: string }[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-2 border-b border-border p-2", className)}>
      <Input
        aria-label="Filtrar conversas"
        placeholder="Buscar conversas…"
        value={filters.search}
        onChange={(event) => onChange({ search: event.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Filtrar por canal"
          className="h-9 flex-1 min-w-[7rem] rounded-md border border-input bg-background px-2 text-sm"
          value={filters.channelId}
          onChange={(event) => onChange({ channelId: event.target.value })}
        >
          <option value="">Todos os canais</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </select>
        {showPipelineFilter ? (
          <select
            aria-label="Filtrar por pipeline"
            className="h-9 flex-1 min-w-[7rem] rounded-md border border-input bg-background px-2 text-sm"
            value={filters.pipelineId}
            onChange={(event) => onChange({ pipelineId: event.target.value })}
          >
            <option value="">Todos os pipelines</option>
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
        ) : null}
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="rounded border-input"
            checked={filters.unreadOnly}
            onChange={(event) => onChange({ unreadOnly: event.target.checked })}
          />
          Não lidas
        </label>
      </div>
    </div>
  );
}
