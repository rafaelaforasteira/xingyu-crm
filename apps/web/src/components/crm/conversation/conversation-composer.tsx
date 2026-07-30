"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { conversationsApi } from "@/lib/api";
import {
  isValidMessageBody,
  sortMessagesChronologically,
} from "@/lib/inbox-utils";
import { queryKeys } from "@/lib/query-keys";
import type { Message, MessageCursorPage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  appendOptimisticMessage,
  patchConversationListItem,
  removeOptimisticMessage,
  replaceOptimisticMessage,
} from "./conversation-cache";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ConversationComposer({
  conversationId,
  listQueryKey,
}: {
  conversationId: string;
  listQueryKey: readonly unknown[];
}) {
  const [body, setBody] = React.useState("");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    setBody("");
  }, [conversationId]);

  const sendMutation = useMutation({
    mutationFn: async ({ text, tempId }: { text: string; tempId: string }) => {
      const message = await conversationsApi.sendMessage(conversationId, text);
      return { message, tempId, text };
    },
    onMutate: async ({ text, tempId }) => {
      const now = new Date().toISOString();
      const optimistic: Message = {
        id: tempId,
        conversationId,
        body: text,
        direction: "OUTBOUND",
        createdAt: now,
        status: "SENDING",
      };
      appendOptimisticMessage(queryClient, conversationId, optimistic);
      patchConversationListItem(queryClient, listQueryKey, conversationId, {
        lastMessagePreview: text,
        lastMessageAt: now,
        unreadCount: 0,
      });
      setBody("");
      return { tempId };
    },
    onSuccess: ({ message, tempId, text }) => {
      replaceOptimisticMessage(queryClient, conversationId, tempId, message);
      patchConversationListItem(queryClient, listQueryKey, conversationId, {
        lastMessagePreview: text,
        lastMessageAt: message.createdAt,
        unreadCount: 0,
      });
      toast.success("Mensagem enviada.");
    },
    onError: (error, _variables, context) => {
      if (context?.tempId) {
        removeOptimisticMessage(queryClient, conversationId, context.tempId);
      }
      toast.error(errorMessage(error, "Não foi possível enviar a mensagem."));
    },
  });

  const submitMessage = () => {
    const text = body.trim();
    if (!isValidMessageBody(text) || sendMutation.isPending) return;
    sendMutation.mutate({
      text,
      tempId: `optimistic-${Date.now()}`,
    });
  };

  return (
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
  );
}

export function useMarkConversationRead(conversationId: string | undefined) {
  const markedRef = React.useRef<string | null>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!conversationId || markedRef.current === conversationId) return;
    markedRef.current = conversationId;

    void conversationsApi.markRead(conversationId).then(() => {
      queryClient.setQueriesData<{ pages?: { data: { id: string; unreadCount: number }[] }[] }>(
        { queryKey: queryKeys.conversations.lists },
        (current) => {
          if (!current?.pages) return current;
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              data: page.data.map((item) =>
                item.id === conversationId ? { ...item, unreadCount: 0 } : item,
              ),
            })),
          };
        },
      );
      queryClient.setQueryData(
        queryKeys.conversations.context(conversationId),
        (current: { conversation?: { unreadCount?: number } } | undefined) =>
          current
            ? {
                ...current,
                conversation: {
                  ...current.conversation,
                  unreadCount: 0,
                },
              }
            : current,
      );
    });
  }, [conversationId, queryClient]);
}

export function useConversationMessages(conversationId: string | undefined) {
  const messagesQuery = useQuery({
    queryKey: queryKeys.conversations.messages(conversationId ?? ""),
    queryFn: async () => {
      if (!conversationId) throw new Error("Nenhuma conversa selecionada.");
      return conversationsApi.messages(conversationId, { pageSize: 50 });
    },
    enabled: Boolean(conversationId),
    retry: false,
  });

  const queryClient = useQueryClient();
  const [loadingOlder, setLoadingOlder] = React.useState(false);

  const loadOlder = async () => {
    if (!conversationId || loadingOlder) return;
    const current = queryClient.getQueryData<MessageCursorPage>(
      queryKeys.conversations.messages(conversationId),
    );
    const cursor = current?.meta.nextCursor ?? current?.data[0]?.id;
    if (!cursor || !current?.meta.hasMore) return;

    setLoadingOlder(true);
    try {
      const older = await conversationsApi.messages(conversationId, {
        pageSize: 50,
        cursor,
        before: true,
      });
      queryClient.setQueryData<MessageCursorPage>(
        queryKeys.conversations.messages(conversationId),
        {
          data: sortMessagesChronologically([...older.data, ...current.data]),
          meta: {
            pageSize: current.meta.pageSize,
            hasMore: older.meta.hasMore,
            nextCursor: older.meta.nextCursor ?? cursor,
          },
        },
      );
    } finally {
      setLoadingOlder(false);
    }
  };

  const sortedMessages = React.useMemo(
    () => sortMessagesChronologically(messagesQuery.data?.data ?? []),
    [messagesQuery.data],
  );

  return {
    messagesQuery,
    sortedMessages,
    loadOlder,
    loadingOlder,
    hasMore: messagesQuery.data?.meta.hasMore ?? false,
  };
}
