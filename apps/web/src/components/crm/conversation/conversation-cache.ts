import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type {
  ConversationListItem,
  Message,
  MessageCursorPage,
  PaginatedResponse,
} from "@/lib/types";
import { queryKeys } from "@/lib/query-keys";
import { sortMessagesChronologically } from "@/lib/inbox-utils";

type ListPage =
  | PaginatedResponse<ConversationListItem>
  | {
      data: ConversationListItem[];
      meta: { pageSize: number; hasMore: boolean; nextCursor: string | null };
    };

function patchListPages(
  pages: ListPage[] | undefined,
  conversationId: string,
  patch: Partial<ConversationListItem>,
): ListPage[] | undefined {
  if (!pages) return pages;
  return pages.map((page) => ({
    ...page,
    data: page.data.map((item) =>
      item.id === conversationId ? { ...item, ...patch } : item,
    ),
  }));
}

export function patchConversationListItem(
  queryClient: QueryClient,
  listQueryKey: readonly unknown[],
  conversationId: string,
  patch: Partial<ConversationListItem>,
) {
  queryClient.setQueryData<InfiniteData<ListPage>>(listQueryKey, (current) => {
    if (!current) return current;
    return {
      ...current,
      pages: patchListPages(current.pages, conversationId, patch) ?? current.pages,
    };
  });

  queryClient.setQueryData<ListPage>(listQueryKey, (current) => {
    if (!current?.data) return current;
    return {
      ...current,
      data: current.data.map((item) =>
        item.id === conversationId ? { ...item, ...patch } : item,
      ),
    };
  });
}

export function appendOptimisticMessage(
  queryClient: QueryClient,
  conversationId: string,
  message: Message,
) {
  const messagesKey = queryKeys.conversations.messages(conversationId);
  queryClient.setQueryData<MessageCursorPage>(messagesKey, (current) => {
    const existing = current?.data ?? [];
    const next = sortMessagesChronologically([...existing, message]);
    return {
      data: next,
      meta: current?.meta ?? {
        pageSize: next.length,
        hasMore: false,
        nextCursor: next[0]?.id ?? null,
      },
    };
  });
}

export function replaceOptimisticMessage(
  queryClient: QueryClient,
  conversationId: string,
  tempId: string,
  message: Message,
) {
  const messagesKey = queryKeys.conversations.messages(conversationId);
  queryClient.setQueryData<MessageCursorPage>(messagesKey, (current) => {
    if (!current) return current;
    const data = current.data.map((item) =>
      item.id === tempId ? message : item,
    );
    return { ...current, data: sortMessagesChronologically(data) };
  });
}

export function removeOptimisticMessage(
  queryClient: QueryClient,
  conversationId: string,
  tempId: string,
) {
  const messagesKey = queryKeys.conversations.messages(conversationId);
  queryClient.setQueryData<MessageCursorPage>(messagesKey, (current) => {
    if (!current) return current;
    return {
      ...current,
      data: current.data.filter((item) => item.id !== tempId),
    };
  });
}
