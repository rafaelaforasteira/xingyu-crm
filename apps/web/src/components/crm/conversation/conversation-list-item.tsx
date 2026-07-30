"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ClientRelativeTime } from "@/components/ui/client-relative-time";
import { conversationsApi } from "@/lib/api";
import { contactName, conversationTimestamp } from "@/lib/inbox-utils";
import { queryKeys } from "@/lib/query-keys";
import type { ConversationListItem } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";
import { ConversationChannelBadge } from "./conversation-channel-badge";

export function ConversationListItemRow({
  conversation,
  href,
  active,
  mounted,
}: {
  conversation: ConversationListItem;
  href: string;
  active: boolean;
  mounted: boolean;
}) {
  const queryClient = useQueryClient();
  const name = contactName(conversation.contact);

  const prefetchContext = () => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.conversations.context(conversation.id),
      queryFn: () => conversationsApi.context(conversation.id),
      staleTime: 30_000,
    });
  };

  return (
    <Link
      href={href}
      prefetch
      data-testid={`conversation-${conversation.id}`}
      onMouseEnter={prefetchContext}
      onFocus={prefetchContext}
      className={cn(
        "flex gap-2.5 border-b border-border/60 px-3 py-2.5 transition-colors hover:bg-accent/50",
        active && "bg-accent",
        "aria-[current=page]:bg-accent",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Avatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{name}</p>
          <div className="flex shrink-0 items-center gap-1.5">
            {conversation.lastMessageAt ? (
              <ClientRelativeTime
                value={conversation.lastMessageAt}
                className="text-[10px] text-muted-foreground"
              />
            ) : null}
            {(conversation.unreadCount ?? 0) > 0 ? (
              <Badge>{conversation.unreadCount}</Badge>
            ) : null}
          </div>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {conversation.channel ? (
            <ConversationChannelBadge
              channel={conversation.channel}
              className="h-4 px-1 text-[10px]"
            />
          ) : null}
          <p className="truncate text-xs text-muted-foreground">
            {conversationTimestamp(
              conversation.lastMessagePreview,
              conversation.lastMessageAt,
              mounted,
              formatRelative,
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}
