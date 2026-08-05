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
  variant = "default",
  awaitingReply,
  onSelect,
}: {
  conversation: ConversationListItem;
  href: string;
  active: boolean;
  mounted: boolean;
  variant?: "default" | "operation";
  awaitingReply?: boolean;
  onSelect?: (conversationId: string) => void;
}) {
  const queryClient = useQueryClient();
  const name = contactName(conversation.contact);
  const stageName = conversation.currentDeal?.stageName;
  const showAwaiting = awaitingReply ?? false;

  const prefetchContext = () => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.conversations.context(conversation.id),
      queryFn: () => conversationsApi.context(conversation.id),
      staleTime: 30_000,
    });
  };

  const className = cn(
    "flex w-full gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    active && "bg-accent",
    "aria-[current=page]:bg-accent",
  );

  const body = (
    <>
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
              <Badge data-testid="conversation-unread-count">
                {conversation.unreadCount}
              </Badge>
            ) : null}
          </div>
        </div>
        <p
          className={cn(
            "mt-0.5 text-xs text-muted-foreground",
            variant === "operation" ? "line-clamp-2" : "truncate",
          )}
        >
          {conversationTimestamp(
            conversation.lastMessagePreview,
            conversation.lastMessageAt,
            mounted,
            formatRelative,
          )}
        </p>
        {variant === "operation" ? (
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground">
            {conversation.channel ? (
              <ConversationChannelBadge
                channel={conversation.channel}
                className="h-4 px-1 text-[10px]"
              />
            ) : null}
            {stageName ? (
              <span className="truncate">· {stageName}</span>
            ) : null}
            {showAwaiting ? (
              <span className="font-medium text-amber-700 dark:text-amber-400">
                · Aguardando
              </span>
            ) : null}
          </div>
        ) : (
          <div className="mt-0.5 flex items-center gap-1.5">
            {conversation.channel ? (
              <ConversationChannelBadge
                channel={conversation.channel}
                className="h-4 px-1 text-[10px]"
              />
            ) : null}
          </div>
        )}
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        data-testid={`conversation-${conversation.id}`}
        onMouseEnter={prefetchContext}
        onFocus={prefetchContext}
        className={className}
        aria-current={active ? "page" : undefined}
        onClick={() => onSelect(conversation.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(conversation.id);
          }
        }}
      >
        {body}
      </button>
    );
  }

  return (
    <Link
      href={href}
      prefetch
      data-testid={`conversation-${conversation.id}`}
      onMouseEnter={prefetchContext}
      onFocus={prefetchContext}
      className={className}
      aria-current={active ? "page" : undefined}
    >
      {body}
    </Link>
  );
}
