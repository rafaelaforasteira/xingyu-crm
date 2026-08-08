"use client";

import * as React from "react";
import { ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBanner } from "@/components/crm/page-header";
import type { Conversation } from "@/lib/types";
import { ConversationChannelBadge } from "./conversation-channel-badge";
import {
  assigneeShortCode,
  conversationContactDisplayName,
  formatLeadCode,
} from "./conversation-list-utils";
import { PipelineStageSelector } from "./pipeline-stage-selector";

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  const message = error.message.toLowerCase();
  if (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("não encontrad")
  ) {
    return "Conversa não encontrada.";
  }
  return error.message || fallback;
}

export function ConversationLeadHeader({
  conversationId,
  detail,
  detailLoading,
  detailError,
  onRetryDetail,
  onBack,
  onOpenContext,
  showContextButton,
}: {
  conversationId: string;
  detail?: Conversation;
  detailLoading: boolean;
  detailError: unknown;
  onRetryDetail: () => void;
  onBack?: () => void;
  onOpenContext?: () => void;
  showContextButton?: boolean;
}) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const displayName = conversationContactDisplayName(detail?.contact);
  const leadCode = formatLeadCode(detail?.deal?.leadSequence);
  const responsible = detail?.deal?.owner ?? detail?.assignee ?? null;
  const shortCode = assigneeShortCode(responsible?.name);
  const stageId = detail?.deal?.stageId ?? null;
  const stageName = detail?.deal?.stage?.name ?? null;
  const dealId = detail?.deal?.id ?? detail?.dealId ?? null;
  const pipelineId =
    detail?.deal?.pipelineId ?? detail?.deal?.pipeline?.id ?? null;
  const showBack = Boolean(onBack) && isMobile;

  return (
    <header
      className="border-b border-border bg-white px-3 py-2.5 sm:px-4"
      data-testid="conversation-lead-header"
    >
      <div className="flex items-center justify-between gap-4">
        {showBack ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Voltar para conversas"
            onClick={onBack}
            data-testid="conversation-header-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        ) : null}

        <div className="min-w-0 flex-1">
          {detailLoading ? (
            <div className="space-y-2" aria-label="Carregando conversa">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : (
            <>
              <h2
                className="truncate text-[15px] font-semibold leading-tight text-foreground"
                title={displayName}
                data-testid="conversation-header"
              >
                {displayName}
              </h2>
              <div
                className="mt-1 flex flex-nowrap items-center gap-1.5 overflow-hidden"
                data-testid="conversation-header-metadata"
              >
                {leadCode ? (
                  <span
                    className="shrink-0 text-xs text-muted-foreground"
                    aria-label={`Código do lead: ${leadCode}`}
                    data-testid="conversation-header-lead-code"
                  >
                    {leadCode}
                  </span>
                ) : null}
                {shortCode ? (
                  <Badge
                    variant="outline"
                    className="h-5 shrink-0 border-border px-1.5 py-0 text-[10px] font-semibold tracking-wide"
                    title={`Responsável: ${responsible?.name ?? shortCode}`}
                    aria-label={`Responsável: ${responsible?.name ?? shortCode}`}
                    data-testid="conversation-header-assignee"
                  >
                    {shortCode}
                  </Badge>
                ) : null}
                {detail?.channel ? (
                  <ConversationChannelBadge
                    channel={detail.channel}
                    className="h-5 max-w-[140px] truncate px-1.5 py-0 text-[10px]"
                    data-testid="conversation-header-channel"
                  />
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {!detailLoading ? (
            <PipelineStageSelector
              dealId={dealId}
              pipelineId={pipelineId}
              stageId={stageId}
              stageName={stageName}
              conversationId={conversationId}
              disabledReason={
                !dealId
                  ? "Esta conversa não possui um lead vinculado."
                  : undefined
              }
            />
          ) : (
            <Skeleton className="h-9 w-40 flex-shrink-0" />
          )}
          {showContextButton && onOpenContext ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Abrir contexto do lead"
              className="lg:hidden"
              onClick={onOpenContext}
            >
              <Info className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {detailError ? (
        <div className="mt-3">
          <ErrorBanner
            message={errorMessage(detailError, "Falha ao carregar a conversa.")}
          />
          <Button variant="outline" size="sm" onClick={onRetryDetail}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
    </header>
  );
}
