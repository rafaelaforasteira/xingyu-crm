"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Send,
  Smile,
  Paperclip,
  Mic,
  Square,
  Image as ImageIcon,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { conversationsApi } from "@/lib/api";
import {
  canSendMessage,
  mergeMessagePages,
  shouldSendOnEnter,
  sortMessagesChronologically,
} from "@/lib/inbox-utils";
import { queryKeys } from "@/lib/query-keys";
import type { Message, MessageCursorPage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  appendOptimisticMessage,
  patchConversationListItem,
  removeOptimisticMessage,
  replaceOptimisticMessage,
} from "./conversation-cache";
import { patchBoardDealByConversation } from "@/lib/board-cache";
import { ConversationEmojiPicker } from "./conversation-emoji-picker";
import {
  classifyFile,
  ConversationAttachmentPreview,
  type PendingAttachment,
} from "./conversation-attachment-preview";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function resizeTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  const next = Math.min(Math.max(el.scrollHeight, 44), 130);
  el.style.height = `${next}px`;
}

export function ConversationComposer({
  conversationId,
  listQueryKey,
}: {
  conversationId: string;
  listQueryKey: readonly unknown[];
}) {
  const { user } = useAuth();
  const [body, setBody] = React.useState("");
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = React.useState(false);
  const [pending, setPending] = React.useState<PendingAttachment[]>([]);
  const [recording, setRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [audioPreview, setAudioPreview] = React.useState<PendingAttachment | null>(
    null,
  );
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const mediaInputRef = React.useRef<HTMLInputElement | null>(null);
  const docInputRef = React.useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<number | null>(null);
  const queryClient = useQueryClient();

  const clearRecordingResources = React.useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setRecordingSeconds(0);
  }, []);

  React.useEffect(() => {
    setBody("");
    setPending((current) => {
      current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return [];
    });
    setAudioPreview((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
    setEmojiOpen(false);
    setAttachMenuOpen(false);
    clearRecordingResources();
    resizeTextarea(textareaRef.current);
  }, [conversationId, clearRecordingResources]);

  React.useEffect(() => () => clearRecordingResources(), [clearRecordingResources]);

  const sendMutation = useMutation({
    mutationFn: async ({
      text,
      files,
      tempId,
    }: {
      text: string;
      files: File[];
      tempId: string;
    }) => {
      const message =
        files.length > 0
          ? await conversationsApi.sendMessageWithAttachments(conversationId, {
              body: text,
              files,
            })
          : await conversationsApi.sendMessage(conversationId, text);
      return { message, tempId, text };
    },
    onMutate: async ({ text, files, tempId }) => {
      const now = new Date().toISOString();
      const optimistic: Message = {
        id: tempId,
        conversationId,
        body: text || null,
        direction: "OUTBOUND",
        createdAt: now,
        status: "SENDING",
        authorId: user?.id ?? null,
        author: user ? { id: user.id, name: user.name } : null,
        attachments: files.map((file, index) => ({
          id: `${tempId}-att-${index}`,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          url: URL.createObjectURL(file),
          kind: classifyFile(file),
        })),
      };
      appendOptimisticMessage(queryClient, conversationId, optimistic);
      patchConversationListItem(queryClient, listQueryKey, conversationId, {
        lastMessagePreview: text || (files[0] ? `Anexo: ${files[0].name}` : "Nova mensagem"),
        lastMessageAt: now,
        unreadCount: 0,
      });
      setBody("");
      setPending((current) => {
        current.forEach((item) => {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        return [];
      });
      setAudioPreview((current) => {
        if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
        return null;
      });
      requestAnimationFrame(() => {
        resizeTextarea(textareaRef.current);
        textareaRef.current?.focus();
      });
      return { tempId };
    },
    onSuccess: ({ message, tempId, text }) => {
      replaceOptimisticMessage(queryClient, conversationId, tempId, message);
      const preview =
        text ||
        message.attachments?.[0]?.fileName ||
        message.body ||
        "Nova mensagem";
      patchConversationListItem(queryClient, listQueryKey, conversationId, {
        lastMessagePreview: preview,
        lastMessageAt: message.createdAt,
        unreadCount: 0,
      });
      patchBoardDealByConversation(queryClient, conversationId, {
        lastMessagePreview: preview,
        lastMessageAt: message.createdAt,
        unreadCount: 0,
        awaitingReply: false,
      });
      toast.success("Mensagem enviada.");
      textareaRef.current?.focus();
    },
    onError: (error, variables, context) => {
      if (context?.tempId) {
        removeOptimisticMessage(queryClient, conversationId, context.tempId);
      }
      setBody(variables.text);
      toast.error(errorMessage(error, "Não foi possível enviar a mensagem."));
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
  });

  const allPending = audioPreview ? [...pending, audioPreview] : pending;
  const canSend =
    canSendMessage(body, allPending.length) && !sendMutation.isPending && !recording;

  const submitMessage = () => {
    const text = body.trim();
    if (!canSendMessage(text, allPending.length) || sendMutation.isPending || recording) {
      return;
    }
    sendMutation.mutate({
      text,
      files: allPending.map((item) => item.file),
      tempId: `optimistic-${Date.now()}`,
    });
  };

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current;
    if (!el) {
      setBody((current) => `${current}${emoji}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}${emoji}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + emoji.length;
      el.setSelectionRange(cursor, cursor);
      resizeTextarea(el);
    });
    setEmojiOpen(false);
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const next: PendingAttachment[] = Array.from(fileList).map((file) => {
      const kind = classifyFile(file);
      return {
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        kind,
        previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
      };
    });
    setPending((current) => [...current, ...next]);
    setAttachMenuOpen(false);
  };

  const removePending = (id: string) => {
    setPending((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
    setAudioPreview((current) => {
      if (current?.id !== id) return current;
      if (current.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  };

  const startRecording = async () => {
    if (recording || sendMutation.isPending) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Gravação de áudio não é suportada neste navegador.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const ext = blob.type.includes("mp4") ? "m4a" : "webm";
        const file = new File([blob], `audio-${Date.now()}.${ext}`, {
          type: blob.type || "audio/webm",
        });
        const previewUrl = URL.createObjectURL(blob);
        setAudioPreview({
          id: `audio-${Date.now()}`,
          file,
          kind: "audio",
          previewUrl,
        });
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecording(false);
      };
      recorder.start();
      setRecording(true);
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((value) => value + 1);
      }, 1000);
    } catch {
      clearRecordingResources();
      toast.error("Permissão do microfone negada ou indisponível.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      clearRecordingResources();
      return;
    }
    recorder.stop();
  };

  const cancelAudioPreview = () => {
    setAudioPreview((current) => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  };

  return (
    <div className="border-t border-border bg-card" data-testid="conversation-composer">
      <ConversationAttachmentPreview items={pending} onRemove={removePending} />
      {audioPreview ? (
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <audio controls src={audioPreview.previewUrl} className="min-w-0 flex-1" />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Cancelar áudio"
            onClick={cancelAudioPreview}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      {recording ? (
        <div
          className="flex items-center gap-2 border-b border-border bg-destructive/5 px-3 py-2 text-xs"
          data-testid="recording-indicator"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
          Gravando… {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:
          {String(recordingSeconds % 60).padStart(2, "0")}
          <Button type="button" size="sm" variant="outline" onClick={stopRecording}>
            <Square className="mr-1 h-3 w-3" />
            Parar
          </Button>
        </div>
      ) : null}

      <form
        className="flex items-end gap-1.5 p-2 sm:gap-2 sm:p-3"
        data-testid="conversation-composer"
        onSubmit={(event) => {
          event.preventDefault();
          submitMessage();
        }}
      >
        <div className="relative shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 shrink-0"
            aria-label="Inserir emoji"
            title="Emoji"
            disabled={sendMutation.isPending || recording}
            onClick={() => {
              setAttachMenuOpen(false);
              setEmojiOpen((open) => !open);
            }}
          >
            <Smile className="h-4 w-4" />
          </Button>
          <ConversationEmojiPicker
            open={emojiOpen}
            onClose={() => setEmojiOpen(false)}
            onSelect={insertEmoji}
          />
        </div>

        <div className="relative shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 shrink-0"
            aria-label="Anexar arquivo"
            title="Anexar"
            disabled={sendMutation.isPending || recording}
            onClick={() => {
              setEmojiOpen(false);
              setAttachMenuOpen((open) => !open);
            }}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          {attachMenuOpen ? (
            <div
              role="menu"
              className="absolute bottom-full left-0 z-40 mb-2 w-44 rounded-xl border border-border bg-card p-1 shadow-lg"
              data-testid="attach-menu"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => mediaInputRef.current?.click()}
              >
                <ImageIcon className="h-4 w-4" />
                Foto ou vídeo
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
                onClick={() => docInputRef.current?.click()}
              >
                <FileText className="h-4 w-4" />
                Documento
              </button>
            </div>
          ) : null}
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,application/pdf,text/plain,text/csv"
            multiple
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        <div className="min-w-0 flex-1">
          <Textarea
            ref={textareaRef}
            aria-label="Mensagem"
            value={body}
            rows={1}
            placeholder="Digite uma mensagem…"
            disabled={sendMutation.isPending || recording}
            className={cn(
              "max-h-[130px] min-h-[44px] resize-none overflow-y-auto rounded-2xl border-border/80 bg-background py-2.5 leading-5 shadow-none",
              "[field-sizing:fixed]",
            )}
            style={{ resize: "none" }}
            data-testid="composer-textarea"
            onChange={(event) => {
              setBody(event.target.value);
              resizeTextarea(event.target);
            }}
            onKeyDown={(event) => {
              if (shouldSendOnEnter(event)) {
                event.preventDefault();
                submitMessage();
              }
            }}
          />
          <p
            className="mt-1 truncate text-center text-[10px] leading-tight text-muted-foreground max-[380px]:text-[9px]"
            data-testid="composer-keyboard-hint"
          >
            <span className="max-[360px]:hidden">
              Enter para enviar · Shift + Enter para quebrar linha
            </span>
            <span className="hidden max-[360px]:inline">
              Enter envia · Shift+Enter quebra
            </span>
          </p>
        </div>

        {recording ? (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="h-10 w-10 shrink-0"
            aria-label="Parar gravação"
            title="Parar"
            onClick={stopRecording}
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 shrink-0"
            aria-label="Gravar áudio"
            title="Áudio"
            disabled={sendMutation.isPending}
            onClick={() => void startRecording()}
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}

        <Button
          type="submit"
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label="Enviar mensagem"
          title="Enviar"
          disabled={!canSend}
        >
          {sendMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}

export function useMarkConversationRead(conversationId: string | undefined) {
  const markedRef = React.useRef<string | null>(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (!conversationId || markedRef.current === conversationId) return;
    markedRef.current = conversationId;

    void conversationsApi.markRead(conversationId).then(() => {
      patchBoardDealByConversation(queryClient, conversationId, {
        unreadCount: 0,
      });
      queryClient.setQueriesData<
        | { pages?: { data: { id: string; unreadCount: number }[] }[] }
        | { data?: { id: string; unreadCount: number }[] }
      >({ queryKey: queryKeys.conversations.lists }, (current) => {
        if (!current) return current;
        if ("pages" in current && Array.isArray(current.pages)) {
          return {
            ...current,
            pages: current.pages.map((page) => ({
              ...page,
              data: page.data.map((item) =>
                item.id === conversationId ? { ...item, unreadCount: 0 } : item,
              ),
            })),
          };
        }
        if ("data" in current && Array.isArray(current.data)) {
          return {
            ...current,
            data: current.data.map((item) =>
              item.id === conversationId ? { ...item, unreadCount: 0 } : item,
            ),
          };
        }
        return current;
      });
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

/** Page size for message history — small enough to exercise older-page loads in demo. */
const MESSAGE_PAGE_SIZE = 20;

export function useConversationMessages(conversationId: string | undefined) {
  const messagesQuery = useQuery({
    queryKey: queryKeys.conversations.messages(conversationId ?? ""),
    queryFn: async () => {
      if (!conversationId) throw new Error("Nenhuma conversa selecionada.");
      return conversationsApi.messages(conversationId, {
        pageSize: MESSAGE_PAGE_SIZE,
      });
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
        pageSize: MESSAGE_PAGE_SIZE,
        cursor,
        before: true,
      });
      queryClient.setQueryData<MessageCursorPage>(
        queryKeys.conversations.messages(conversationId),
        {
          data: mergeMessagePages(older.data, current.data),
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
