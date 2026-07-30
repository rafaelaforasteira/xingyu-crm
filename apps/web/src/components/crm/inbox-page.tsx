"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Inbox, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { conversationsApi } from "@/lib/api";
import {
  channelName,
  contactName,
  conversationTimestamp,
  isValidMessageBody,
  normalizeConversations,
  normalizeMessages,
  sortMessagesChronologically,
} from "@/lib/inbox-utils";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatDate, formatRelative } from "@/lib/utils";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function InboxPage() {
  const params = useParams<{ conversationId?: string | string[] }>();
  const router = useRouter();
  const routeId = params?.conversationId;
  const selectedId = Array.isArray(routeId) ? routeId[0] : routeId;
  const activeId = selectedId || undefined;
  const [filter, setFilter] = React.useState("");
  const [body, setBody] = React.useState("");
  const [mobileListOpen, setMobileListOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => setMounted(true), []);

  const listQuery = useQuery({
    queryKey: queryKeys.conversations.list({ filter }),
    queryFn: () =>
      conversationsApi.list({
        page: 1,
        pageSize: 50,
        search: filter || undefined,
      }),
    retry: false,
  });
  const conversations = React.useMemo(
    () => normalizeConversations(listQuery.data),
    [listQuery.data],
  );

  React.useEffect(() => {
    const firstConversation = conversations[0];
    if (!selectedId && firstConversation) {
      router.replace(`/inbox/${encodeURIComponent(firstConversation.id)}`);
    }
  }, [conversations, router, selectedId]);

  const detailQuery = useQuery({
    queryKey: queryKeys.conversations.detail(activeId ?? ""),
    queryFn: async () => {
      if (!activeId) throw new Error("Nenhuma conversa selecionada.");
      return conversationsApi.get(activeId);
    },
    enabled: Boolean(activeId),
    retry: false,
  });

  const messagesQuery = useQuery({
    queryKey: queryKeys.conversations.messages(activeId ?? ""),
    queryFn: async () => {
      if (!activeId) throw new Error("Nenhuma conversa selecionada.");
      return conversationsApi.messages(activeId);
    },
    enabled: Boolean(activeId),
    retry: false,
  });
  const messageItems = React.useMemo(
    () => normalizeMessages(messagesQuery.data),
    [messagesQuery.data],
  );
  const sortedMessages = React.useMemo(
    () => sortMessagesChronologically(messageItems),
    [messageItems],
  );

  React.useEffect(() => {
    setBody("");
    setMobileListOpen(false);
  }, [activeId]);
  React.useEffect(() => {
    if (!messagesQuery.isLoading && sortedMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [activeId, messagesQuery.isLoading, sortedMessages.length]);

  const sendMutation = useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) =>
      conversationsApi.sendMessage(conversationId, text),
    onSuccess: async (_, variables) => {
      setBody("");
      toast.success("Mensagem enviada.");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.messages(variables.conversationId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.conversations.detail(variables.conversationId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists }),
      ]);
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Não foi possível enviar a mensagem.")),
  });

  const submitMessage = () => {
    const text = body.trim();
    if (!activeId || !isValidMessageBody(text) || sendMutation.isPending) return;
    sendMutation.mutate({ conversationId: activeId, text });
  };

  const detail = detailQuery.data;
  const detailContactName = contactName(detail?.contact);

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] min-h-[34rem] flex-col">
      <PageHeader title="Inbox" description="Atendimento unificado." />
      {listQuery.error ? (
        <div>
          <ErrorBanner message={errorMessage(listQuery.error, "Falha ao carregar conversas.")} />
          <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-card md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_260px]">
        <section
          aria-label="Lista de conversas"
          className={cn(
            "min-h-0 flex-col border-border md:flex md:border-r",
            activeId && !mobileListOpen ? "hidden" : "flex",
          )}
        >
          <div className="border-b border-border p-2">
            <Input
              aria-label="Filtrar conversas"
              placeholder="Filtrar conversas…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto" data-testid="conversation-list">
            {listQuery.isLoading ? (
              <div className="space-y-2 p-3" aria-label="Carregando conversas">
                {[0, 1, 2].map((item) => (
                  <Skeleton key={item} className="h-16 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Inbox vazia"
                description="Nenhuma conversa encontrada."
                className="m-3 border-0"
              />
            ) : (
              conversations.map((conversation) => (
                <Link
                  key={conversation.id}
                  href={`/inbox/${conversation.id}`}
                  data-testid={`conversation-${conversation.id}`}
                  className={cn(
                    "flex gap-2.5 border-b border-border/60 px-3 py-2.5 hover:bg-accent/50",
                    activeId === conversation.id && "bg-accent",
                  )}
                >
                  <Avatar name={contactName(conversation.contact)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {contactName(conversation.contact)}
                      </p>
                      {(conversation.unreadCount ?? 0) > 0 ? (
                        <Badge>{conversation.unreadCount}</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {conversationTimestamp(
                        conversation.lastMessagePreview,
                        conversation.lastMessageAt,
                        mounted,
                        formatRelative,
                      )}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section
          aria-label="Conversa ativa"
          className={cn(
            "min-h-0 flex-col",
            activeId && !mobileListOpen ? "flex" : "hidden md:flex",
          )}
        >
          {!activeId ? (
            <EmptyState
              icon={Inbox}
              title={listQuery.isLoading ? "Carregando Inbox" : "Selecione uma conversa"}
              className="m-auto border-0"
            />
          ) : (
            <>
              <div className="border-b border-border px-3 py-3 sm:px-4">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Voltar para conversas"
                    className="md:hidden"
                    onClick={() => setMobileListOpen(true)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  {detailQuery.isLoading ? (
                    <div className="flex-1 space-y-2" aria-label="Carregando conversa">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <p className="truncate font-semibold" data-testid="conversation-header">
                        {detailContactName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {channelName(detail?.channel)}
                        {detail?.status ? ` · ${detail.status}` : ""}
                      </p>
                    </div>
                  )}
                </div>
                {detailQuery.error ? (
                  <div className="mt-3">
                    <ErrorBanner
                      message={errorMessage(detailQuery.error, "Falha ao carregar a conversa.")}
                    />
                    <Button variant="outline" size="sm" onClick={() => void detailQuery.refetch()}>
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
                {messagesQuery.isLoading ? (
                  <div className="space-y-3" aria-label="Carregando mensagens">
                    <Skeleton className="h-14 w-3/4" />
                    <Skeleton className="ml-auto h-14 w-2/3" />
                    <Skeleton className="h-14 w-1/2" />
                  </div>
                ) : messagesQuery.error ? (
                  <div>
                    <ErrorBanner
                      message={errorMessage(messagesQuery.error, "Falha ao carregar mensagens.")}
                    />
                    <Button variant="outline" size="sm" onClick={() => void messagesQuery.refetch()}>
                      Tentar novamente
                    </Button>
                  </div>
                ) : sortedMessages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sem mensagens</p>
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

              {!detailQuery.error ? (
                <form
                  className="flex gap-2 border-t border-border p-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitMessage();
                  }}
                >
                  <Input
                    aria-label="Mensagem"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Responder…"
                    disabled={sendMutation.isPending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    aria-label="Enviar mensagem"
                    disabled={!isValidMessageBody(body) || sendMutation.isPending}
                  >
                    {sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              ) : null}
            </>
          )}
        </section>

        <aside className="hidden min-h-0 overflow-y-auto border-l border-border p-4 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contexto
          </p>
          {detailQuery.isLoading ? (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : detail?.contact ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Avatar name={detailContactName} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{detailContactName}</p>
                  {detail.contact.id ? (
                    <Link
                      href={`/contacts/${detail.contact.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Ver contato
                    </Link>
                  ) : null}
                </div>
              </div>
              <p className="break-words text-muted-foreground">
                {detail.contact.email || detail.contact.phone || detail.contact.whatsapp || "—"}
              </p>
              {detail.dealId ? <Badge variant="outline">Negociação vinculada</Badge> : null}
              {detail.assignee?.name ? (
                <p className="text-xs text-muted-foreground">
                  Responsável: {detail.assignee.name}
                </p>
              ) : null}
              {detail.status ? (
                <p className="text-xs text-muted-foreground">Status: {detail.status}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Sem contato vinculado</p>
          )}
        </aside>
      </div>
    </div>
  );
}
