"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone } from "lucide-react";
import { conversationsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Deal, Pipeline } from "@/lib/types";
import { channelLabel } from "@/lib/operation-utils";
import { cn } from "@/lib/utils";
import { sortPipelineStages } from "@/components/crm/deal-board-dialogs";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { ConversationThread } from "@/components/crm/conversation/conversation-thread";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

export function DealConversationPanel({
  deal,
  pipeline,
  onClose,
  onStageChange,
  mobile,
  backLabel,
  historyOnly = false,
}: {
  deal: Deal;
  pipeline: Pipeline;
  onClose: () => void;
  onStageChange: (stageId: string) => void;
  mobile?: boolean;
  backLabel?: string;
  /** Conversation History MVP: no composer, no stage editor. */
  historyOnly?: boolean;
}) {
  const conversationId = deal.conversationId ?? undefined;
  const stages = sortPipelineStages(pipeline.stages);
  const contactLabel = deal.contact?.name || deal.name;
  const phone = deal.contact?.whatsapp || deal.contact?.phone || null;
  const channel = channelLabel(deal);
  const stageName =
    stages.find((stage) => stage.id === deal.stageId)?.name ?? null;

  const detailQuery = useQuery({
    queryKey: queryKeys.conversations.detail(conversationId ?? ""),
    queryFn: () => conversationsApi.get(conversationId!),
    enabled: Boolean(conversationId),
    retry: false,
  });

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (historyOnly) {
        onClose();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("[data-testid='emoji-popover'], [data-testid='attach-menu']")
      ) {
        return;
      }
      if (document.querySelector("[data-testid='recording-indicator']")) return;
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [historyOnly, onClose]);

  const showBackButton = historyOnly ? Boolean(mobile) : true;

  return (
    <section
      aria-label={`Conversa com ${contactLabel}`}
      className={cn(
        "flex h-full min-h-0 w-full flex-col",
        historyOnly ? "bg-transparent" : "bg-background",
      )}
      data-history-only={historyOnly ? "true" : "false"}
    >
      <header
        data-testid="deal-operation-header"
        className={cn(
          "flex shrink-0 items-center gap-2 border-b border-border bg-card",
          historyOnly ? "min-h-14 px-4 py-3 sm:px-5" : "px-2.5 py-2",
        )}
      >
        {showBackButton ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-9 w-9 shrink-0"
            aria-label={
              backLabel ?? (mobile ? "Voltar ao Kanban" : "Fechar conversa")
            }
            onClick={onClose}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : null}

        <Avatar name={contactLabel} size="sm" className="shrink-0" />

        <div className="min-w-0 flex-1">
          <h2
            className="truncate text-sm font-semibold leading-tight"
            data-testid="conversation-header"
          >
            {contactLabel}
          </h2>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-muted-foreground">
            {phone ? (
              <span className="inline-flex min-w-0 items-center gap-0.5 truncate">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{phone}</span>
              </span>
            ) : null}
            {channel ? <span className="shrink-0">· {channel}</span> : null}
            {deal.conversationStatus ? (
              <span className="shrink-0">· {deal.conversationStatus}</span>
            ) : null}
            {historyOnly && stageName ? (
              <span className="shrink-0 truncate">· {stageName}</span>
            ) : null}
            {(deal.unreadCount ?? 0) > 0 ? (
              <span className="shrink-0 font-medium text-primary">
                · {deal.unreadCount} não lidas
              </span>
            ) : null}
          </div>
        </div>

        {!historyOnly ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <Label htmlFor={`deal-stage-${deal.id}`} className="sr-only">
              Etapa do negócio
            </Label>
            <Select
              id={`deal-stage-${deal.id}`}
              aria-label="Etapa do negócio"
              data-testid="deal-stage-select"
              className="h-8 max-w-[9.5rem] text-xs"
              value={deal.stageId}
              onChange={(event) => onStageChange(event.target.value)}
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </Select>
            <Link
              href={`/pipelines/${deal.pipelineId}/deals/${deal.id}`}
              className="inline-flex h-8 items-center rounded-lg border border-input bg-card px-2 text-xs font-medium shadow-sm hover:bg-accent"
              title="Abrir ficha completa"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="sr-only">Ficha</span>
            </Link>
          </div>
        ) : null}
      </header>

      {!conversationId ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <EmptyState
            title="Ainda não existe uma conversa vinculada a este lead."
            description="A conversa aparecerá aqui quando o cliente entrar por um canal conectado."
            className="m-auto border-0"
          />
          {!historyOnly ? (
            <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
              Envio indisponível sem conversa e canal válidos.
            </div>
          ) : null}
        </div>
      ) : (
        <ConversationThread
          conversationId={conversationId}
          detail={detailQuery.data}
          detailLoading={detailQuery.isLoading}
          detailError={detailQuery.error}
          onRetryDetail={() => void detailQuery.refetch()}
          listQueryKey={queryKeys.conversations.lists}
          mounted
          visible
          hideHeader
          hideComposer={historyOnly}
          showContextButton={false}
          className="min-h-0 flex-1"
        />
      )}
    </section>
  );
}
