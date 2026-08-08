"use client";

import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types";
import { MessageContentRenderer } from "./message-content-renderer";
import {
  normalizeDeliveryStatus,
  normalizeMessageContent,
  outboundSenderDisplayName,
  shouldShowInboundSender,
} from "./message-content-utils";
import { MessageMetadata } from "./message-metadata";
import {
  InboundSenderLabel,
  MessageSenderLabel,
} from "./message-sender-label";

export function MessageBubble({
  message,
  inboundName,
  mounted,
  conversationType,
}: {
  message: Message;
  inboundName?: string | null;
  mounted: boolean;
  /** Reserved for future group chats. Individual conversations stay hidden. */
  conversationType?: string | null;
}) {
  const outbound = message.direction === "OUTBOUND";
  const internal = message.direction === "INTERNAL";
  const content = normalizeMessageContent(message);
  const deliveryStatus = normalizeDeliveryStatus(message.status, {
    persisted: Boolean(message.id) && message.status !== "SENDING",
  });
  const showOutboundSender = outbound || message.senderType === "automation";
  const showInboundSender =
    message.direction === "INBOUND" && shouldShowInboundSender(conversationType);

  return (
    <article
      data-testid={`message-${message.id}`}
      data-direction={message.direction}
      data-message-type={content.type}
      className={cn(
        "flex w-full",
        outbound || internal ? "justify-end" : "justify-start",
      )}
    >
      <div
        data-testid="message-bubble"
        className={cn(
          "w-fit max-w-[min(72%,680px)] rounded-2xl px-3 py-2 text-sm shadow-[0_1px_1px_rgba(0,0,0,0.04)]",
          outbound
            ? "rounded-tr-md bg-[#dcf8c6] text-foreground dark:bg-emerald-950/50"
            : internal
              ? "rounded-tr-md border border-dashed border-border bg-muted/40 text-foreground"
              : "rounded-tl-md bg-card text-foreground",
          content.type === "STICKER" && "bg-transparent shadow-none",
        )}
      >
        {showOutboundSender ? (
          <MessageSenderLabel name={outboundSenderDisplayName(message)} />
        ) : null}

        {showInboundSender ? (
          <InboundSenderLabel name={inboundName?.trim() || "Participante"} />
        ) : null}

        <MessageContentRenderer content={content} />

        <MessageMetadata
          createdAt={message.createdAt}
          direction={message.direction}
          status={
            outbound && !internal
              ? deliveryStatus
              : null
          }
          mounted={mounted}
        />
      </div>
    </article>
  );
}
