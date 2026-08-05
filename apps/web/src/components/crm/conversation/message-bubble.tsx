"use client";

import * as React from "react";
import { FileText, Download } from "lucide-react";
import {
  formatAttachmentSize,
  formatMessageMetaLine,
  resolveAttachmentUrl,
  translateMessageStatus,
} from "@/lib/inbox-utils";
import { cn, formatDate } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import type { Message } from "@/lib/types";

export function MessageBubble({
  message,
  inboundName,
  mounted,
}: {
  message: Message;
  inboundName?: string | null;
  mounted: boolean;
}) {
  const outbound = message.direction === "OUTBOUND";
  const statusLabel = translateMessageStatus(message.status);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  return (
    <article
      data-testid={`message-${message.id}`}
      data-direction={message.direction}
      className={cn(
        "flex w-full",
        outbound ? "justify-end" : "justify-start",
      )}
    >
      <div
        data-testid="message-bubble"
        className={cn(
          "w-fit max-w-[min(70%,680px)] rounded-2xl px-3 py-2 text-sm shadow-[0_1px_1px_rgba(0,0,0,0.04)]",
          outbound
            ? "rounded-tr-md bg-[#dcf8c6] text-foreground dark:bg-emerald-950/50"
            : "rounded-tl-md bg-card text-foreground",
        )}
      >
        <p
          className="truncate text-[10px] leading-tight text-muted-foreground/70"
          data-testid="message-sender-line"
          title={formatMessageMetaLine(
            message,
            inboundName,
            mounted,
            formatDate,
          )}
        >
          {formatMessageMetaLine(message, inboundName, mounted, formatDate)}
        </p>

        {message.body ? (
          <p className="mt-1 whitespace-pre-wrap break-words">{message.body}</p>
        ) : null}

        {message.attachments?.length ? (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment) => {
              const src = resolveAttachmentUrl(attachment.url);
              if (attachment.kind === "image") {
                return (
                  <button
                    key={attachment.id}
                    type="button"
                    className="block overflow-hidden rounded-lg"
                    onClick={() => setPreviewUrl(src)}
                    aria-label={`Abrir imagem ${attachment.fileName}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={attachment.fileName}
                      className="max-h-56 max-w-full object-contain"
                    />
                  </button>
                );
              }
              if (attachment.kind === "video") {
                return (
                  <video
                    key={attachment.id}
                    controls
                    preload="metadata"
                    className="max-h-56 w-full rounded-lg"
                    src={src}
                  >
                    <track kind="captions" />
                  </video>
                );
              }
              if (attachment.kind === "audio") {
                return (
                  <audio
                    key={attachment.id}
                    controls
                    preload="metadata"
                    className="w-full min-w-[220px]"
                    src={src}
                  >
                    <track kind="captions" />
                  </audio>
                );
              }
              return (
                <a
                  key={attachment.id}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2 text-xs hover:bg-background"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {attachment.fileName}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatAttachmentSize(attachment.fileSize)}
                  </span>
                  <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </a>
              );
            })}
          </div>
        ) : null}

        {statusLabel ? (
          <p className="mt-1 text-right text-[10px] opacity-60">{statusLabel}</p>
        ) : null}
      </div>

      <Dialog
        open={Boolean(previewUrl)}
        onOpenChange={(open) => {
          if (!open) setPreviewUrl(null);
        }}
        title="Imagem"
        wide
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Prévia" className="max-h-[70vh] w-full object-contain" />
        ) : null}
      </Dialog>
    </article>
  );
}
