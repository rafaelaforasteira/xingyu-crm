"use client";

import * as React from "react";
import { AtSign, Loader2, Send } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import { Popover } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { notesApi } from "@/lib/api";

type User = { id: string; name: string; avatarUrl?: string | null };

export function OrderNotesPanel({ orderId, users }: { orderId: string; users: User[] }) {
  const queryClient = useQueryClient();
  const [content, setContent] = React.useState("");
  const [mentionsOpen, setMentionsOpen] = React.useState(false);
  const [error, setError] = React.useState("");
  const queryKey = ["notes", "order", orderId] as const;
  const notesQuery = useQuery({
    queryKey,
    queryFn: () => notesApi.listPage({ orderId, pageSize: 30 }),
  });
  const createNote = useMutation({
    mutationFn: () => notesApi.create({ orderId, content: content.trim() }),
    onSuccess: () => {
      setContent("");
      setError("");
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (value) =>
      setError(value instanceof Error ? value.message : "Não foi possível salvar a nota."),
  });
  const notes = notesQuery.data?.data ?? [];
  const mention = (user: User) => {
    setContent((value) => `${value}${value && !value.endsWith(" ") ? " " : ""}@${user.name} `);
    setMentionsOpen(false);
  };

  return (
    <div className="flex min-h-72 flex-col rounded-xl border border-border/70 bg-muted/25 p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Notas internas
      </p>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!content.trim()) return;
          setError("");
          createNote.mutate();
        }}
      >
        <Textarea
          value={content}
          maxLength={5000}
          rows={3}
          placeholder="Escreva uma nota para a equipe..."
          aria-label="Nova nota do pedido"
          onChange={(event) => setContent(event.target.value)}
          className="resize-none bg-background"
        />
        <div className="flex items-center justify-between gap-2">
          <Popover
            open={mentionsOpen}
            onOpenChange={setMentionsOpen}
            align="start"
            contentWidth={260}
            contentClassName="rounded-xl"
            aria-label="Mencionar pessoa"
            trigger={
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Mencionar pessoa na nota"
                onClick={() => setMentionsOpen((open) => !open)}
              >
                <AtSign className="h-3.5 w-3.5" />
                Mencionar
              </button>
            }
          >
            <div className="max-h-64 overflow-y-auto p-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-muted"
                  onClick={() => mention(user)}
                >
                  <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                  <span className="truncate">@{user.name}</span>
                </button>
              ))}
            </div>
          </Popover>
          <button
            type="submit"
            disabled={!content.trim() || createNote.isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createNote.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Enviar
          </button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </form>
      <div className="mt-3 min-h-0 flex-1 border-t border-border/70 pt-3">
        {notesQuery.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando notas...</p>
        ) : notes.length ? (
          <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-lg border border-border/60 bg-background/80 p-2.5"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <Avatar
                    name={note.author?.name || "Usuário"}
                    src={note.author?.avatarUrl}
                    className="h-5 w-5 text-[8px]"
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
                    {note.author?.name || "Usuário"}
                  </span>
                  <time className="shrink-0 text-[10px] text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(note.createdAt))}
                  </time>
                </div>
                <p className="whitespace-pre-wrap break-words text-xs text-foreground">
                  {note.content}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma nota adicionada.</p>
        )}
      </div>
    </div>
  );
}
