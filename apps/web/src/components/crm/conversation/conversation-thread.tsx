"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/crm/page-header";
import { buildMessageTimeline } from "@/lib/inbox-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ConversationComposer,
  useConversationMessages,
  useMarkConversationRead,
} from "./conversation-composer";
import { ConversationEmptyState } from "./conversation-empty-state";
import { ConversationLeadHeader } from "./conversation-lead-header";
import { conversationContactDisplayName } from "./conversation-list-utils";
import {
  CONVERSATION_THREAD_SCROLL_CLASS,
  CONVERSATION_THREAD_SHELL_CLASS,
  CONVERSATION_THREAD_TEXTURE_CLASS,
} from "./conversation-thread-surface";
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
  const detailContactName = conversationContactDisplayName(detail?.contact);

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
        <ConversationEmptyState />
      ) : (
        <>
          {!hideHeader ? (
            <ConversationLeadHeader
              conversationId={conversationId}
              detail={detail}
              detailLoading={detailLoading}
              detailError={detailError}
              onRetryDetail={onRetryDetail}
              onBack={onBack}
              onOpenContext={onOpenContext}
              showContextButton={showContextButton}
            />
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
            className={CONVERSATION_THREAD_SHELL_CLASS}
            data-testid="conversation-thread-shell"
          >
            <div
              className={CONVERSATION_THREAD_TEXTURE_CLASS}
              aria-hidden="true"
              data-testid="conversation-thread-texture"
            />
            <div
              ref={listRef}
              className={CONVERSATION_THREAD_SCROLL_CLASS}
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
                        detailContactName === "Contato sem nome"
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
