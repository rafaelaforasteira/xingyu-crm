"use client";

import * as React from "react";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/crm/page-header";
import {
  buildMessageTimeline,
  channelName,
  contactName,
} from "@/lib/inbox-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ConversationComposer,
  useConversationMessages,
  useMarkConversationRead,
} from "./conversation-composer";
import { ConversationChannelBadge } from "./conversation-channel-badge";
import { MessageBubble } from "./message-bubble";
import type { Conversation } from "@/lib/types";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ConversationThread({
  conversationId,
  detail,
  detailLoading,
  detailError,
  onRetryDetail,
  listQueryKey,
  mounted,
  visible,
  onBack,
  onOpenContext,
  showContextButton,
  hideHeader,
  hideComposer,
  className,
}: {
  conversationId?: string;
  detail?: Conversation;
  detailLoading: boolean;
  detailError: unknown;
  onRetryDetail: () => void;
  listQueryKey: readonly unknown[];
  mounted: boolean;
  visible: boolean;
  onBack?: () => void;
  onOpenContext?: () => void;
  showContextButton?: boolean;
  hideHeader?: boolean;
  /** History-only mode (Conversation History MVP). */
  hideComposer?: boolean;
  className?: string;
}) {
  useMarkConversationRead(conversationId);

  const { messagesQuery, sortedMessages, loadOlder, loadingOlder, hasMore } =
    useConversationMessages(conversationId);

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = React.useRef(true);
  const detailContactName = contactName(detail?.contact);

  React.useEffect(() => {
    stickToBottomRef.current = true;
  }, [conversationId]);

  React.useEffect(() => {
    if (messagesQuery.isLoading || sortedMessages.length === 0) return;
    if (!stickToBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    stickToBottomRef.current = false;
  }, [conversationId, messagesQuery.isLoading, sortedMessages.length]);

  const handleLoadOlder = React.useCallback(async () => {
    const el = listRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const prevTop = el?.scrollTop ?? 0;
    stickToBottomRef.current = false;
    await loadOlder();
    requestAnimationFrame(() => {
      if (!el) return;
      el.scrollTop = el.scrollHeight - prevHeight + prevTop;
    });
  }, [loadOlder]);

  const timeline = React.useMemo(
    () => (mounted ? buildMessageTimeline(sortedMessages) : []),
    [mounted, sortedMessages],
  );

  return (
    <section
      aria-label="Conversa ativa"
      data-testid="conversation-pane"
      className={cn(
        "min-h-0 w-full flex-col",
        hideHeader ? "max-w-none" : "max-w-[860px] justify-self-center",
        !conversationId
          ? "hidden md:flex"
          : visible
            ? "flex"
            : "hidden md:flex",
        className,
      )}
    >
      {!conversationId ? (
        <EmptyState
          title="Selecione uma conversa"
          description="Escolha um item na lista para abrir o histórico."
          className="m-auto border-0"
        />
      ) : (
        <>
          {!hideHeader ? (
          <div className="border-b border-border bg-card px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2">
              {onBack ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Voltar para conversas"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : null}
              {detailLoading ? (
                <div className="flex-1 space-y-2" aria-label="Carregando conversa">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ) : (
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate font-semibold"
                    data-testid="conversation-header"
                  >
                    {detailContactName}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {detail?.channel ? (
                      <ConversationChannelBadge channel={detail.channel} />
                    ) : (
                      <span>{channelName(detail?.channel)}</span>
                    )}
                    {detail?.status ? <span>· {detail.status}</span> : null}
                  </div>
                </div>
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
          </div>
          ) : detailError ? (
            <div className="border-b border-border px-3 py-2">
              <ErrorBanner
                message={errorMessage(detailError, "Falha ao carregar a conversa.")}
              />
              <Button variant="outline" size="sm" onClick={onRetryDetail}>
                Tentar novamente
              </Button>
            </div>
          ) : null}

          <div
            ref={listRef}
            className="conversation-thread-bg scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3 sm:p-4"
            data-testid="message-list"
            aria-label="Histórico de mensagens"
            aria-live="polite"
            aria-busy={messagesQuery.isLoading || loadingOlder}
          >
            {hasMore ? (
              <div className="flex justify-center pb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid="load-older-messages"
                  disabled={loadingOlder}
                  onClick={() => void handleLoadOlder()}
                >
                  {loadingOlder ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden />
                  ) : null}
                  Carregar mensagens anteriores
                </Button>
              </div>
            ) : null}

            {messagesQuery.isLoading ? (
              <div className="space-y-3" aria-label="Carregando mensagens">
                <Skeleton className="h-14 w-3/4" />
                <Skeleton className="ml-auto h-14 w-2/3" />
                <Skeleton className="h-14 w-1/2" />
              </div>
            ) : messagesQuery.error ? (
              <div>
                <ErrorBanner
                  message={errorMessage(
                    messagesQuery.error,
                    "Falha ao carregar mensagens.",
                  )}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void messagesQuery.refetch()}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : sortedMessages.length === 0 ? (
              <EmptyState
                title="Ainda não existem mensagens"
                description="O histórico aparecerá aqui quando houver mensagens vinculadas a esta conversa."
                className="m-auto border-0 bg-transparent"
              />
            ) : (
              timeline.map((item) =>
                item.type === "day" ? (
                  <div
                    key={`day-${item.key}`}
                    data-testid="message-day-separator"
                    className="flex items-center justify-center py-2"
                  >
                    <span className="rounded-full bg-background/80 px-3 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                      {item.label}
                    </span>
                  </div>
                ) : (
                  <MessageBubble
                    key={item.message.id}
                    message={item.message}
                    inboundName={
                      detailContactName === "Conversa"
                        ? "Cliente"
                        : detailContactName
                    }
                    mounted={mounted}
                  />
                ),
              )
            )}
            <div ref={messagesEndRef} data-testid="messages-end" />
          </div>

          {!detailError && !hideComposer ? (
            <ConversationComposer
              conversationId={conversationId}
              listQueryKey={listQueryKey}
            />
          ) : null}
        </>
      )}
    </section>
  );
}
