"use client";

import * as React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { DEFAULT_TIMEZONE } from "@xingyu/config";
import { activitiesApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Activity } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { presentHistoryEvent } from "./lead-history-presenter";

function HistoryRow({ event }: { event: Activity }) {
  const actorName = event.actor?.name?.trim() || "Sistema";
  const presentation = presentHistoryEvent(event);
  return (
    <li className="flex gap-2.5" data-testid={`history-event-${event.type.toLowerCase()}`}>
      <span title={actorName} className="mt-0.5 shrink-0">
        <Avatar name={actorName} src={event.actor?.avatarUrl} size="sm" className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">{presentation.label}</p>
        {presentation.detail ? <p className="truncate text-xs text-muted-foreground" title={presentation.detail}>{presentation.detail}</p> : null}
        <ClientRelativeTime value={event.createdAt} className="text-[11px] text-muted-foreground" />
      </div>
    </li>
  );
}

const dayFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: DEFAULT_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const key = dayFormatter.format(date);
  if (key === dayFormatter.format(today)) return "HOJE";
  if (key === dayFormatter.format(yesterday)) return "ONTEM";
  return key;
}

export function LeadHistory({ dealId, leadName }: { dealId: string; leadName: string }) {
  const [open, setOpen] = React.useState(false);
  const query = useInfiniteQuery({
    queryKey: queryKeys.deals.history(dealId),
    queryFn: ({ pageParam }) => activitiesApi.history(dealId, pageParam, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
  if (query.isLoading) return <Skeleton className="h-24 w-full" />;
  const events = query.data?.pages.flatMap((page) => page.data) ?? [];
  if (!events.length) return <p className="text-xs text-muted-foreground">Nenhum acontecimento registrado.</p>;
  const recent = events.slice(0, 5);
  const groups = events.reduce<Record<string, Activity[]>>((acc, event) => {
    const label = dayLabel(event.createdAt); (acc[label] ??= []).push(event); return acc;
  }, {});
  return (
    <>
      <ul className="space-y-3" aria-label="Acontecimentos recentes do lead">{recent.map((event) => <HistoryRow key={event.id} event={event} />)}</ul>
      <Button variant="link" size="sm" className="mt-2 h-auto px-0 text-xs" onClick={() => setOpen(true)}>Ver histórico completo</Button>
      <Dialog open={open} onOpenChange={setOpen} title={`Histórico · ${leadName}`} wide>
        <div className="scrollbar-thin max-h-[65vh] space-y-5 overflow-y-auto pr-2">
          {Object.entries(groups).map(([label, items]) => <section key={label}><h3 className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground">{label}</h3><ul className="space-y-4 border-l border-border pl-4">{items.map((event) => <HistoryRow key={event.id} event={event} />)}</ul></section>)}
          {query.hasNextPage ? <Button variant="outline" size="sm" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? "Carregando…" : "Carregar mais"}</Button> : null}
        </div>
      </Dialog>
    </>
  );
}
