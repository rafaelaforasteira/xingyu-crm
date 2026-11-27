"use client";

import * as React from "react";
import { Check, Ellipsis, FilePlus2, Loader2, Trash2 } from "lucide-react";
import { Popover } from "@/components/ui/popover";
import type { LeadFile, Message, MessageAttachment } from "@/lib/types";
import { cn } from "@/lib/utils";

const ELIGIBLE_KINDS = new Set(["image", "video", "audio", "voice", "ptt", "document", "file"]);

export function isAttachmentEligibleForLeadFiles(attachment: MessageAttachment) {
  return Boolean(
    attachment.id && attachment.url && ELIGIBLE_KINDS.has(attachment.kind.toLowerCase()),
  );
}

export function MessageActionsMenu({
  message,
  filesByAttachment,
  pendingAttachmentId,
  onSave,
  onRemove,
}: {
  message: Message;
  filesByAttachment: Map<string, LeadFile>;
  pendingAttachmentId?: string | null;
  onSave: (message: Message, attachment: MessageAttachment) => void;
  onRemove: (file: LeadFile) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const eligible = (message.attachments ?? []).filter(isAttachmentEligibleForLeadFiles);
  if (!eligible.length) return null;
  const outbound = message.direction !== "INBOUND";

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      align={outbound ? "end" : "start"}
      contentClassName="w-72 rounded-lg"
      aria-label="Ações dos arquivos da mensagem"
      className={cn(
        "absolute top-0 z-10 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
        outbound ? "-left-8" : "-right-8",
      )}
      trigger={
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir ações da mensagem"
          onClick={() => setOpen(true)}
        >
          <Ellipsis className="h-4 w-4" />
        </button>
      }
    >
      <div className="space-y-1 p-1.5">
        {eligible.map((attachment) => {
          const saved = filesByAttachment.get(attachment.id);
          const pending = pendingAttachmentId === attachment.id;
          return (
            <div key={attachment.id} className="rounded-md border border-border/60 p-1">
              {eligible.length > 1 ? (
                <p
                  className="truncate px-2 py-1 text-[10px] text-muted-foreground"
                  title={attachment.fileName}
                >
                  {attachment.fileName}
                </p>
              ) : null}
              {saved ? (
                <>
                  <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-emerald-600" /> Salvo em Arquivos
                  </div>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-50"
                    disabled={pending}
                    onClick={() => {
                      setOpen(false);
                      onRemove(saved);
                    }}
                  >
                    {pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remover dos Arquivos
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-50"
                  disabled={pending}
                  onClick={() => {
                    setOpen(false);
                    onSave(message, attachment);
                  }}
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FilePlus2 className="h-3.5 w-3.5" />
                  )}
                  Guardar em Arquivos
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Popover>
  );
}
