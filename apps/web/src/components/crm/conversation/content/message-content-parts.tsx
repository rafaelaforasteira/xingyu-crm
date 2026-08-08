"use client";

import * as React from "react";
import { Download, FileText, Sticker } from "lucide-react";
import {
  formatAttachmentSize,
  resolveAttachmentUrl,
} from "@/lib/inbox-utils";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import type { NormalizedMessageContent } from "../message-content-utils";

function MediaUnavailable({ label }: { label: string }) {
  return (
    <div
      className="rounded-lg border border-dashed border-border/70 bg-background/50 px-3 py-4 text-center text-xs text-muted-foreground"
      data-testid="media-unavailable"
    >
      {label}
    </div>
  );
}

export function TextMessageContent({ text }: { text: string }) {
  return (
    <p
      className="whitespace-pre-wrap break-words text-sm leading-5"
      data-testid="message-text-content"
    >
      {text}
    </p>
  );
}

export function MessageCaption({ caption }: { caption: string }) {
  return (
    <p
      className="mt-1.5 whitespace-pre-wrap break-words px-0.5 text-sm leading-5"
      data-testid="message-caption"
    >
      {caption}
    </p>
  );
}

export function ImageMessageContent({
  src,
  alt,
  fileName,
}: {
  src: string;
  alt: string;
  fileName: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  if (failed) {
    return <MediaUnavailable label="Imagem indisponível" />;
  }

  return (
    <>
      <button
        type="button"
        className="block w-full overflow-hidden rounded-lg"
        onClick={() => setPreviewOpen(true)}
        aria-label={`Abrir imagem ${fileName}`}
        data-testid="message-image-content"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-56 max-w-full object-contain"
          onError={() => setFailed(true)}
        />
      </button>
      <Dialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Imagem"
        wide
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-h-[70vh] w-full object-contain" />
      </Dialog>
    </>
  );
}

export function VideoMessageContent({
  src,
  poster,
}: {
  src: string;
  poster?: string | null;
}) {
  const [failed, setFailed] = React.useState(false);
  if (failed) return <MediaUnavailable label="Vídeo indisponível" />;
  return (
    <video
      controls
      preload="metadata"
      poster={poster ?? undefined}
      className="max-h-56 w-full rounded-lg bg-black/5"
      src={src}
      data-testid="message-video-content"
      onError={() => setFailed(true)}
    >
      <track kind="captions" />
    </video>
  );
}

export function AudioMessageContent({
  src,
  isVoice,
  fileName,
}: {
  src: string;
  isVoice: boolean;
  fileName?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <div
        data-testid={isVoice ? "message-voice-content" : "message-audio-content"}
      >
        <MediaUnavailable
          label={isVoice ? "[Mensagem de voz]" : "Áudio indisponível"}
        />
      </div>
    );
  }
  return (
    <div
      className="min-w-[220px] space-y-1"
      data-testid={isVoice ? "message-voice-content" : "message-audio-content"}
    >
      {!isVoice && fileName ? (
        <p className="truncate text-[11px] text-muted-foreground">{fileName}</p>
      ) : null}
      <audio
        controls
        preload="metadata"
        className="w-full"
        src={src}
        onError={() => setFailed(true)}
      >
        <track kind="captions" />
      </audio>
    </div>
  );
}

export function DocumentMessageContent({
  src,
  fileName,
  fileSize,
  unavailable,
}: {
  src: string;
  fileName: string;
  fileSize?: number | null;
  unavailable?: boolean;
}) {
  if (unavailable) {
    return (
      <div
        className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2 text-xs"
        data-testid="message-document-content"
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{fileName}</p>
          <p className="text-muted-foreground">Arquivo indisponível</p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-2 text-xs hover:bg-background"
      data-testid="message-document-content"
    >
      <FileText className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-medium">{fileName}</span>
      <span className="shrink-0 text-muted-foreground">
        {formatAttachmentSize(fileSize)}
      </span>
      <Download className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
    </a>
  );
}

export function StickerMessageContent({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <div
        className="flex items-center gap-1 text-xs text-muted-foreground"
        data-testid="message-sticker-content"
      >
        <Sticker className="h-4 w-4" aria-hidden />
        Figurinha indisponível
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || "Figurinha"}
      className="h-28 w-28 object-contain"
      data-testid="message-sticker-content"
      onError={() => setFailed(true)}
    />
  );
}

export function UnsupportedMessageContent() {
  return (
    <p
      className="text-sm italic text-muted-foreground"
      data-testid="message-unsupported-content"
    >
      Tipo de mensagem ainda não suportado.
    </p>
  );
}

export function MessageContentRenderer({
  content,
  className,
}: {
  content: NormalizedMessageContent;
  className?: string;
}) {
  const primary = content.primaryAttachment;
  const src = primary ? resolveAttachmentUrl(primary.mediaUrl) : "";

  return (
    <div className={cn("space-y-1.5", className)} data-testid="message-content">
      {content.type === "TEXT" && content.text ? (
        <TextMessageContent text={content.text} />
      ) : null}

      {content.type === "IMAGE" && primary ? (
        <ImageMessageContent
          src={src}
          alt={content.caption?.trim() ? "Imagem da conversa" : primary.fileName}
          fileName={primary.fileName}
        />
      ) : null}

      {content.type === "VIDEO" && primary ? (
        <VideoMessageContent src={src} poster={primary.thumbnailUrl} />
      ) : null}

      {(content.type === "AUDIO" || content.type === "VOICE") && primary ? (
        <AudioMessageContent
          src={src}
          isVoice={content.isVoice || content.type === "VOICE"}
          fileName={primary.fileName}
        />
      ) : null}

      {content.type === "DOCUMENT" && primary ? (
        <DocumentMessageContent
          src={src}
          fileName={primary.fileName}
          fileSize={primary.fileSize}
        />
      ) : null}

      {content.type === "STICKER" && primary ? (
        <StickerMessageContent src={src} alt="Figurinha" />
      ) : null}

      {content.type === "UNSUPPORTED" || content.isUnsupported ? (
        !content.text && !primary ? <UnsupportedMessageContent /> : null
      ) : null}

      {/* Extra attachments beyond primary (rare) */}
      {content.attachments.slice(1).map((attachment) => {
        const extraSrc = resolveAttachmentUrl(attachment.mediaUrl);
        if (attachment.kind === "image") {
          return (
            <ImageMessageContent
              key={attachment.id}
              src={extraSrc}
              alt={attachment.fileName}
              fileName={attachment.fileName}
            />
          );
        }
        if (attachment.kind === "video") {
          return <VideoMessageContent key={attachment.id} src={extraSrc} />;
        }
        if (attachment.kind === "audio") {
          return (
            <AudioMessageContent
              key={attachment.id}
              src={extraSrc}
              isVoice={false}
              fileName={attachment.fileName}
            />
          );
        }
        return (
          <DocumentMessageContent
            key={attachment.id}
            src={extraSrc}
            fileName={attachment.fileName}
            fileSize={attachment.fileSize}
          />
        );
      })}

      {content.caption ? <MessageCaption caption={content.caption} /> : null}
    </div>
  );
}
