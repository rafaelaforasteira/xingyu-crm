"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Mic, Paperclip, Send } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label, Select } from "@/components/ui/form-controls";
import { tasksApi } from "@/lib/api";
import type { Task, TaskStatusDefinition, UserRef } from "@/lib/types";

export function TaskWorkspace({ task, statuses, users, open, onOpenChange, onChanged }: { task: Task | null; statuses: TaskStatusDefinition[]; users: UserRef[]; open: boolean; onOpenChange: (open: boolean) => void; onChanged: () => void }) {
  const client = useQueryClient();
  const [body, setBody] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [mentionIds, setMentionIds] = React.useState<string[]>([]);
  const recorder = React.useRef<MediaRecorder | null>(null);
  const chunks = React.useRef<Blob[]>([]);
  const detail = useQuery({ queryKey: ["tasks", task?.id, "workspace"], queryFn: () => tasksApi.workspace(task!.id), enabled: open && Boolean(task?.id) });
  const update = useMutation({ mutationFn: (data: Partial<Task>) => tasksApi.update(task!.id, data), onSuccess: () => { void client.invalidateQueries({ queryKey: ["tasks", task?.id, "workspace"] }); onChanged(); }, onError: (error: Error) => toast.error(error.message) });
  const comment = useMutation({ mutationFn: () => { const form = new FormData(); form.set("body", body); form.set("mentionIds", JSON.stringify(mentionIds)); files.forEach((file) => form.append("files", file)); return tasksApi.comment(task!.id, form); }, onSuccess: () => { setBody(""); setFiles([]); setMentionIds([]); void client.invalidateQueries({ queryKey: ["tasks", task?.id, "workspace"] }); toast.success("Comentário publicado"); }, onError: (error: Error) => toast.error(error.message) });
  const toggleRecording = async () => {
    if (recorder.current?.state === "recording") { recorder.current.stop(); return; }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return toast.error("Gravação de áudio indisponível neste navegador.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const media = new MediaRecorder(stream); chunks.current = [];
    media.ondataavailable = (event) => chunks.current.push(event.data);
    media.onstop = () => { setFiles((current) => [...current, new File(chunks.current, `audio-${Date.now()}.webm`, { type: media.mimeType || "audio/webm" })]); stream.getTracks().forEach((track) => track.stop()); recorder.current = null; };
    recorder.current = media; media.start();
  };
  const current = detail.data?.task ?? task;
  return <Dialog open={open} onOpenChange={onOpenChange} title={current?.title ?? "Tarefa"} description="Workspace operacional e colaboração interna" wide className="max-h-[92vh] max-w-5xl overflow-y-auto">
    {current ? <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <main className="space-y-5">
        <Textarea value={current.description ?? ""} placeholder="Descrição da tarefa" onChange={(event) => update.mutate({ description: event.target.value })} />
        <section><h3 className="mb-3 text-sm font-semibold">Comentários</h3><div className="space-y-3">
          {(detail.data?.comments ?? []).map((item) => <article key={item.id} className="rounded-xl border p-3"><div className="mb-2 flex items-center gap-2"><Avatar size="sm" name={item.author.name} src={item.author.avatarUrl} /><strong className="text-sm">{item.author.name}</strong><time className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("pt-BR")}</time></div><p className="whitespace-pre-wrap text-sm">{item.body}</p>{item.attachments.map((file) => file.kind === "audio" ? <audio key={file.id} controls className="mt-2 w-full" src={file.url} /> : <a key={file.id} className="mt-2 flex items-center gap-2 text-sm text-primary hover:underline" href={file.url} target="_blank"><FileText className="h-4 w-4" />{file.fileName}</a>)}</article>)}
        </div><Textarea className="mt-3" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Escreva um comentário. Use @ e selecione pessoas ao lado." /><div className="mt-2 flex flex-wrap items-center gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"><Paperclip className="h-4 w-4" /> Anexar<input className="hidden" type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label><Button type="button" variant="outline" onClick={toggleRecording}><Mic className="h-4 w-4" />{recorder.current ? "Parar" : "Gravar áudio"}</Button><span className="text-xs text-muted-foreground">{files.length ? `${files.length} arquivo(s)` : ""}</span><Button className="ml-auto" disabled={comment.isPending || (!body.trim() && !files.length)} onClick={() => comment.mutate()}><Send className="h-4 w-4" />Enviar</Button></div></section>
      </main>
      <aside className="space-y-4 rounded-xl bg-muted/30 p-4"><div><Label>Status</Label><Select value={current.statusDefinitionId ?? ""} onChange={(e) => update.mutate({ statusDefinitionId: e.target.value })}>{statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}</Select></div><div><Label>Responsável</Label><Select value={current.assigneeId ?? ""} onChange={(e) => update.mutate({ assigneeId: e.target.value })}>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</Select></div><div><Label>Data e hora</Label><Input type="datetime-local" value={current.dueAt ? new Date(current.dueAt).toISOString().slice(0,16) : ""} onChange={(e) => update.mutate({ dueAt: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div><div><Label>Mencionar</Label><Select value="" onChange={(e) => { if (e.target.value) setMentionIds((ids) => [...new Set([...ids, e.target.value])]); }}><option value="">Adicionar pessoa…</option>{users.map((user) => <option key={user.id} value={user.id}>@{user.name}</option>)}</Select><p className="mt-1 text-xs text-muted-foreground">{mentionIds.map((id) => `@${users.find((u) => u.id === id)?.name}`).join(", ")}</p></div><div><h3 className="text-sm font-semibold">Atividade</h3><div className="mt-2 space-y-2">{(detail.data?.activity ?? []).map((event) => <div key={event.id} className="text-xs"><span>{event.title}</span><time className="block text-muted-foreground">{new Date(event.createdAt).toLocaleString("pt-BR")}</time></div>)}</div></div></aside>
    </div> : null}
  </Dialog>;
}
