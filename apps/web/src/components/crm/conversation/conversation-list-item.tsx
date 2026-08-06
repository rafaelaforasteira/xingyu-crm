"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_TIMEZONE } from "@xingyu/config";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { conversationsApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { ConversationListItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConversationChannelBadge } from "./conversation-channel-badge";
import { formatConversationTimestamp } from "./format-conversation-timestamp";
import {
  assigneeShortCode,
  contactInitials,
  conversationContactDisplayName,
  conversationPreviewText,
  formatLeadCode,
  formatUnreadCount,
} from "./conversation-list-utils";

function TruncatedText({
  text,
  className,
  as: Component = "span",
}: {
  text: string;
  className?: string;
  as?: "span" | "p";
}) {
  const ref = React.useRef<HTMLElement | null>(null);
  const [truncated, setTruncated] = React.useState(false);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  }, [text]);

  return (
    <Component
      ref={ref as never}
      className={cn("truncate", className)}
      title={truncated ? text : undefined}
    >
      {text}
    </Component>
  );
}

export function ConversationListItemRow({
  conversation,
  href,
  active,
  mounted: _mounted,
  variant = "default",
  awaitingReply,
  onSelect,
  timeZone = DEFAULT_TIMEZONE,
}: {
  conversation: ConversationListItem;
  href: string;
  active: boolean;
  mounted: boolean;
  variant?: "default" | "operation";
  awaitingReply?: boolean;
  onSelect?: (conversationId: string) => void;
  timeZone?: string;
}) {
  const queryClient = useQueryClient();
  const name = conversationContactDisplayName(conversation.contact);
  const avatarName = contactInitials(name) ? name : null;
  const stageName = conversation.currentDeal?.stageName?.trim() || null;
  const leadCode = formatLeadCode(conversation.currentDeal?.leadSequence);
  const responsible =
    conversation.currentDeal?.owner ?? conversation.assignee ?? null;
  const shortCode = assigneeShortCode(responsible?.name);
  const unread = conversation.unreadCount ?? 0;
  const isUnread = unread > 0;
  const isClosed =
    conversation.status === "RESOLVED" || conversation.status === "ARCHIVED";
  const showAwaiting =
    awaitingReply ??
    conversation.awaitingReply ??
    (conversation.status === "OPEN" &&
      conversation.lastMessageDirection === "INBOUND");
  const preview = conversationPreviewText(conversation.lastMessagePreview);
  const timestamp = formatConversationTimestamp(
    conversation.lastMessageAt,
    timeZone,
  );

  const prefetchContext = () => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.conversations.context(conversation.id),
      queryFn: () => conversationsApi.context(conversation.id),
      staleTime: 30_000,
    });
  };

  const className = cn(
    "relative flex w-full min-h-[102px] gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    !active && !showAwaiting && "bg-background hover:bg-accent/40",
    !active && showAwaiting && "bg-emerald-50/70 hover:bg-emerald-50",
    active && "bg-accent hover:bg-accent",
    isClosed && !active && "opacity-80",
    "aria-[current=page]:bg-accent",
  );

  const body = (
    <>
      {showAwaiting ? (
        <span
          className="absolute inset-y-0 left-0 w-[3px] bg-emerald-500"
          aria-hidden="true"
        />
      ) : null}
      <span className="sr-only">
        {showAwaiting ? "Resposta da equipe pendente. " : null}
        {isUnread ? `${formatUnreadCount(unread)} mensagens por ler. ` : null}
        {active ? "Conversa selecionada. " : null}
      </span>
      <Avatar
        name={avatarName}
        src={conversation.contact?.avatarUrl}
        size="list"
        alt={name}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <TruncatedText
            as="p"
            text={name}
            className={cn(
              "min-w-0 text-sm text-foreground",
              isUnread || showAwaiting ? "font-semibold" : "font-medium",
              isClosed && "text-muted-foreground",
            )}
          />
          {timestamp ? (
            <time
              dateTime={conversation.lastMessageAt ?? undefined}
              className="shrink-0 pt-0.5 text-[10px] tabular-nums text-muted-foreground"
            >
              {timestamp}
            </time>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
          {leadCode ? (
            <span className="shrink-0" data-testid="conversation-lead-code">
              {leadCode}
            </span>
          ) : null}
          {responsible && shortCode ? (
            <span
              className="inline-flex shrink-0 rounded bg-primary/10 px-1 py-px text-[10px] font-medium text-primary"
              title={responsible.name}
              aria-label={`Responsável: ${responsible.name}`}
              data-testid="conversation-assignee-code"
            >
              {shortCode}
            </span>
          ) : (
            <span
              className="inline-flex shrink-0 rounded bg-muted px-1 py-px text-[10px] text-muted-foreground"
              aria-label="Sem responsável"
            >
              Sem resp.
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <TruncatedText
            as="p"
            text={preview}
            className={cn(
              "min-w-0 flex-1 text-xs",
              isUnread
                ? "font-semibold text-foreground"
                : showAwaiting
                  ? "font-medium text-foreground/90"
                  : "font-normal text-muted-foreground",
            )}
          />
          {isUnread ? (
            <Badge
              data-testid="conversation-unread-count"
              className="h-5 min-w-5 shrink-0 justify-center rounded-full px-1.5 text-[10px]"
              aria-label={`${unread} mensagens por ler`}
            >
              {formatUnreadCount(unread)}
            </Badge>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center gap-1.5 pt-0.5">
          {conversation.channel ? (
            <div className="min-w-0 max-w-[58%] shrink">
              <ConversationChannelBadge
                channel={conversation.channel}
                className="h-4 max-w-full truncate px-1 text-[10px]"
              />
            </div>
          ) : null}
          <span
            className={cn(
              "inline-flex min-w-0 max-w-[42%] shrink truncate rounded-md bg-muted/80 px-1.5 py-0.5 text-[10px] text-muted-foreground",
              !stageName && "italic",
            )}
            title={stageName ?? "Sem etapa"}
            data-testid="conversation-stage-tag"
          >
            {stageName ?? "Sem etapa"}
          </span>
          {variant === "operation" ? null : null}
        </div>
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        data-testid={`conversation-${conversation.id}`}
        data-awaiting-reply={showAwaiting ? "true" : "false"}
        data-unread={isUnread ? "true" : "false"}
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
      data-awaiting-reply={showAwaiting ? "true" : "false"}
      data-unread={isUnread ? "true" : "false"}
      onMouseEnter={prefetchContext}
      onFocus={prefetchContext}
      className={className}
      aria-current={active ? "page" : undefined}
    >
      {body}
    </Link>
  );
}
