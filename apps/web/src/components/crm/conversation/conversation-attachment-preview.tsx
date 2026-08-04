"use client";

import * as React from "react";
import { X, FileText, Film, ImageIcon } from "lucide-react";
import { formatAttachmentSize } from "@/lib/inbox-utils";
import { Button } from "@/components/ui/button";

export type PendingAttachment = {
  id: string;
  file: File;
  previewUrl?: string;
  kind: "image" | "video" | "audio" | "document";
};

export function classifyFile(file: File): PendingAttachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

export function ConversationAttachmentPreview({
  items,
  onRemove,
}: {
  items: PendingAttachment[];
  onRemove: (id: string) => void;
}) {
  if (!items.length) return null;

  return (
    <ul
      className="flex flex-wrap gap-2 border-b border-border bg-card px-3 py-2"
      data-testid="attachment-preview-list"
    >
      {items.map((item) => (
        <li
          key={item.id}
          className="flex max-w-full items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1.5 text-xs"
        >
          {item.kind === "image" && item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.previewUrl}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          ) : item.kind === "video" ? (
            <Film className="h-4 w-4 shrink-0" />
          ) : item.kind === "image" ? (
            <ImageIcon className="h-4 w-4 shrink-0" />
          ) : (
            <FileText className="h-4 w-4 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{item.file.name}</p>
            <p className="text-muted-foreground">
              {formatAttachmentSize(item.file.size)}
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0"
            aria-label={`Remover ${item.file.name}`}
            onClick={() => onRemove(item.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
