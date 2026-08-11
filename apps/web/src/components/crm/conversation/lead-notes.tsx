"use client";

import * as React from "react";
import { Check, Circle, FilePlus2, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { notesApi, settingsApi, tasksApi } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { Note, Task, UserRef } from "@/lib/types";
import { isTaskDone } from "./lead-task-utils";
import { CreateTaskDialog, type LeadLinks } from "./lead-tasks";

const MAX_NOTE_LENGTH = 5000;

function formatNoteTimestamp(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  if (sameDay(date, today)) return `Hoje, ${time}`;
  if (sameDay(date, yesterday)) return `Ontem, ${time}`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function LinkedTask({ task }: { task: Task }) {
  return (
    <div className="mt-2 flex min-w-0 items-center gap-1.5 rounded-md bg-background/70 px-2 py-1.5 text-[11px]">
      {isTaskDone(task) ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="h-3.5 w-3.5 shrink-0" style={{ color: task.statusDefinition?.color }} />
      )}
      <span className="truncate">{task.title}</span>
      <span className="ml-auto shrink-0 text-muted-foreground">
        {task.statusDefinition?.name ?? (isTaskDone(task) ? "Concluída" : "Aberta")}
      </span>
    </div>
  );
}

function NoteCard({ note, onCreateTask }: { note: Note; onCreateTask: (note: Note) => void }) {
  const linkedTask = note.generatedTasks?.[0];
  const authorName = note.author?.name?.trim() || "Usuário";
  return (
    <li
      className="rounded-lg border border-border/70 bg-muted/35 p-2.5"
      data-testid="lead-note-row"
    >
      <div className="mb-2 flex items-center gap-2">
        <Avatar name={authorName} src={note.author?.avatarUrl} className="h-6 w-6 text-[9px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{authorName}</p>
          <time className="block text-[10px] text-muted-foreground" dateTime={note.createdAt}>
            {formatNoteTimestamp(note.createdAt)}
          </time>
        </div>
      </div>
      <p className="whitespace-pre-wrap break-words text-xs text-foreground">{note.content}</p>
      {linkedTask ? (
        <LinkedTask task={linkedTask} />
      ) : (
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          onClick={() => onCreateTask(note)}
        >
          <FilePlus2 className="h-3.5 w-3.5" />
          Criar tarefa a partir da nota
        </button>
      )}
    </li>
  );
}

export function LeadNotes({
  links,
  owner,
  onCountChange,
}: {
  links: LeadLinks;
  owner?: UserRef | null;
  onCountChange?: (count: number) => void;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = React.useState("");
  const [error, setError] = React.useState("");
  const [allOpen, setAllOpen] = React.useState(false);
  const [historyNotes, setHistoryNotes] = React.useState<Note[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [taskNote, setTaskNote] = React.useState<Note | null>(null);
  const queryParams = { dealId: links.dealId, pageSize: 100 };
  const notesQuery = useQuery({
    queryKey: queryKeys.notes("deal", links.dealId ?? "none"),
    queryFn: () => notesApi.listPage(queryParams),
    enabled: Boolean(links.dealId),
  });
  const statusesQuery = useQuery({
    queryKey: queryKeys.tasks.statuses,
    queryFn: () => tasksApi.statuses(),
    staleTime: 300_000,
  });
  const usersQuery = useQuery({
    queryKey: [...queryKeys.settings, "users"],
    queryFn: settingsApi.users,
    staleTime: 300_000,
  });
  const notes = React.useMemo(() => notesQuery.data?.data ?? [], [notesQuery.data?.data]);
  const total = notesQuery.data?.meta.total ?? notes.length;
  React.useEffect(() => onCountChange?.(total), [onCountChange, total]);
  React.useEffect(() => {
    if (!allOpen) return;
    let cancelled = false;
    setHistoryNotes(notes);
    const pageCount = Math.ceil(total / 100);
    if (pageCount <= 1) return;
    setHistoryLoading(true);
    void Promise.all(
      Array.from({ length: pageCount - 1 }, (_, index) =>
        notesApi.listPage({ dealId: links.dealId, page: index + 2, pageSize: 100 }),
      ),
    )
      .then((pages) => {
        if (!cancelled) setHistoryNotes([...notes, ...pages.flatMap((page) => page.data)]);
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar todo o histórico.");
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [allOpen, links.dealId, notes, total]);
  const createNote = useMutation({
    mutationFn: () => {
      const trimmed = content.trim();
      if (!trimmed) throw new Error("Escreva uma anotação antes de salvar.");
      return notesApi.create({ content: trimmed, dealId: links.dealId });
    },
    onSuccess: () => {
      setContent("");
      setError("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.notes("deal", links.dealId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.deals.history(links.dealId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
    onError: (value) =>
      setError(value instanceof Error ? value.message : "Não foi possível salvar a anotação."),
  });
  const refreshLinkedTask = () => {
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    if (links.dealId) void queryClient.invalidateQueries({ queryKey: queryKeys.deals.history(links.dealId) });
  };

  if (!links.dealId) {
    return <p className="text-xs text-muted-foreground">Sem negociação vinculada.</p>;
  }
  if (notesQuery.isLoading) return <Skeleton className="h-24 w-full" />;

  return (
    <div className="space-y-3" data-testid="lead-notes-history">
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          createNote.mutate();
        }}
      >
        <Textarea
          value={content}
          maxLength={MAX_NOTE_LENGTH}
          rows={3}
          placeholder="Escreva uma anotação interna..."
          aria-label="Nova anotação interna"
          onChange={(event) => setContent(event.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            {content.length}/{MAX_NOTE_LENGTH}
          </span>
          <Button type="submit" size="sm" disabled={!content.trim() || createNote.isPending}>
            {createNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Anotar
          </Button>
        </div>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {notes.length ? (
        <ul className="space-y-2">
          {notes.slice(0, 3).map((note) => (
            <NoteCard key={note.id} note={note} onCreateTask={setTaskNote} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhuma anotação ainda.</p>
      )}
      {total > 3 ? (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setAllOpen(true)}
        >
          Ver todas as notas ({total})
        </button>
      ) : null}

      <Dialog
        open={allOpen}
        onOpenChange={setAllOpen}
        title="Histórico de notas"
        description={`${total} anotação(ões) internas`}
        wide
      >
        <ul className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
          {historyNotes.map((note) => (
            <NoteCard key={note.id} note={note} onCreateTask={setTaskNote} />
          ))}
          {historyLoading ? <Skeleton className="h-16 w-full" /> : null}
        </ul>
      </Dialog>
      <CreateTaskDialog
        open={Boolean(taskNote)}
        onOpenChange={(open) => {
          if (!open) setTaskNote(null);
        }}
        links={links}
        owner={owner}
        statuses={statusesQuery.data ?? []}
        users={usersQuery.data ?? []}
        initialDescription={taskNote?.content ?? ""}
        sourceNoteId={taskNote?.id}
        onCreated={refreshLinkedTask}
      />
    </div>
  );
}
