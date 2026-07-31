"use client";

import * as React from "react";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/crm/page-header";
import { channelName, contactName } from "@/lib/inbox-utils";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ConversationComposer,
  useConversationMessages,
  useMarkConversationRead,
} from "./conversation-composer";
import { ConversationChannelBadge } from "./conversation-channel-badge";
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
}) {
  useMarkConversationRead(conversationId);

  const { messagesQuery, sortedMessages, loadOlder, loadingOlder, hasMore } =
    useConversationMessages(conversationId);

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!messagesQuery.isLoading && sortedMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [conversationId, messagesQuery.isLoading, sortedMessages.length]);

  const detailContactName = contactName(detail?.contact);

  return (
    <section
      aria-label="Conversa ativa"
      className={cn(
        "min-h-0 flex-col",
        !conversationId
          ? "hidden md:flex"
          : visible
            ? "flex"
            : "hidden md:flex",
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
          <div className="border-b border-border px-3 py-3 sm:px-4">
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

          <div
            className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3 sm:p-4"
            data-testid="message-list"
            aria-live="polite"
          >
            {hasMore ? (
              <div className="flex justify-center pb-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loadingOlder}
                  onClick={() => void loadOlder()}
                >
                  {loadingOlder ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
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
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sem mensagens
              </p>
            ) : (
              sortedMessages.map((message) => (
                <article
                  key={message.id}
                  data-testid={`message-${message.id}`}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm sm:max-w-[75%]",
                    message.direction === "OUTBOUND"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  <p className="break-words">{message.body}</p>
                  <p className="mt-1 text-[10px] opacity-70">
                    {mounted ? formatDate(message.createdAt, "dd/MM HH:mm") : ""}
                    {message.status ? ` · ${message.status}` : ""}
                  </p>
                </article>
              ))
            )}
            <div ref={messagesEndRef} data-testid="messages-end" />
          </div>

          {!detailError ? (
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
