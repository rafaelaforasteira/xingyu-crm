"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { conversationsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn, formatRelative } from "@/lib/utils";
import { PageHeader, ErrorBanner } from "@/components/crm/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";

export function InboxPage() {
  const params = useParams<{ conversationId?: string }>();
  const selectedId = params?.conversationId;
  const [filter, setFilter] = React.useState("");

  const list = useQuery({
    queryKey: queryKeys.conversations.list({ filter }),
    queryFn: () =>
      conversationsApi.list({
        page: 1,
        pageSize: 50,
        search: filter || undefined,
      }),
    retry: false,
  });

  const conversations = list.data?.data ?? [];
  const activeId = selectedId ?? conversations[0]?.id;

  const detail = useQuery({
    queryKey: queryKeys.conversations.detail(activeId ?? "none"),
    queryFn: () => conversationsApi.get(activeId!),
    enabled: !!activeId,
    retry: false,
  });

  const messages = useQuery({
    queryKey: queryKeys.conversations.messages(activeId ?? "none"),
    queryFn: () => conversationsApi.messages(activeId!),
    enabled: !!activeId,
    retry: false,
  });

  const queryClient = useQueryClient();
  const [body, setBody] = React.useState("");
  const send = useMutation({
    mutationFn: () => conversationsApi.sendMessage(activeId!, body.trim()),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(activeId!),
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <PageHeader title="Inbox" description="Atendimento unificado." />
      {list.error ? (
        <ErrorBanner message={(list.error as Error).message} />
      ) : null}

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-card lg:grid-cols-[280px_1fr_260px]">
        {/* List */}
        <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-2">
            <Input
              placeholder="Filtrar conversas…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            {list.isLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Inbox vazia"
                description="Nenhuma conversa na API."
                className="m-3 border-0"
              />
            ) : (
              conversations.map((c) => (
                <Link
                  key={c.id}
                  href={`/inbox/${c.id}`}
                  className={cn(
                    "flex gap-2.5 border-b border-border/60 px-3 py-2.5 hover:bg-accent/50",
                    activeId === c.id && "bg-accent",
                  )}
                >
                  <Avatar name={c.contact?.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {c.contact?.name ?? "Conversa"}
                      </p>
                      {(c.unreadCount ?? 0) > 0 ? (
                        <Badge>{c.unreadCount}</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.lastMessagePreview ?? formatRelative(c.lastMessageAt)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="flex min-h-0 flex-col">
          {!activeId ? (
            <EmptyState
              icon={Inbox}
              title="Selecione uma conversa"
              className="m-auto border-0"
            />
          ) : (
            <>
              <div className="border-b border-border px-4 py-3">
                <p className="font-semibold">
                  {detail.data?.contact?.name ?? "Conversa"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {detail.data?.channel ?? "Canal"} · {detail.data?.status ?? ""}
                </p>
              </div>
              <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-4">
                {(messages.data ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.direction === "OUTBOUND"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted",
                    )}
                  >
                    {m.body}
                  </div>
                ))}
                {(messages.data ?? []).length === 0 && !messages.isLoading ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Sem mensagens
                  </p>
                ) : null}
              </div>
              <form
                className="flex gap-2 border-t border-border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!body.trim()) return;
                  send.mutate();
                }}
              >
                <Input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Responder…"
                />
                <Button type="submit" size="icon" disabled={send.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Context */}
        <div className="hidden min-h-0 overflow-y-auto border-l border-border p-4 lg:block">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contexto
          </p>
          {detail.data?.contact ? (
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Avatar name={detail.data.contact.name} />
                <div>
                  <p className="font-medium">{detail.data.contact.name}</p>
                  <Link
                    href={`/contacts/${detail.data.contact.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver contato
                  </Link>
                </div>
              </div>
              <p className="text-muted-foreground">
                {detail.data.contact.email || detail.data.contact.phone || "—"}
              </p>
              {detail.data.dealId ? (
                <Badge variant="outline">Deal vinculado</Badge>
              ) : null}
              {detail.data.assignee ? (
                <p className="text-xs text-muted-foreground">
                  Responsável: {detail.data.assignee.name}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Sem contexto</p>
          )}
        </div>
      </div>
    </div>
  );
}
