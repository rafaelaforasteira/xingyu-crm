"use client";

import * as React from "react";
import { File, FileText, Image as ImageIcon, Mic, Music, Trash2, Video } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { dealsApi } from "@/lib/api";
import { formatAttachmentSize, resolveAttachmentUrl } from "@/lib/inbox-utils";
import { queryKeys } from "@/lib/query-keys";
import type { LeadFile } from "@/lib/types";
import {
  AudioMessageContent,
  DocumentMessageContent,
  VideoMessageContent,
} from "./content/message-content-parts";

function fileLabel(file: LeadFile) {
  if (file.fileName.trim()) return file.fileName;
  const kind = file.kind.toLowerCase();
  if (kind === "image") return "Imagem";
  if (kind === "video") return "Vídeo";
  if (kind === "voice" || kind === "ptt") return "Mensagem de voz";
  if (kind === "audio") return "Áudio";
  return "Documento";
}

function FileIcon({ kind }: { kind: string }) {
  const normalized = kind.toLowerCase();
  if (normalized === "image") return <ImageIcon className="h-4 w-4" />;
  if (normalized === "video") return <Video className="h-4 w-4" />;
  if (normalized === "voice" || normalized === "ptt") return <Mic className="h-4 w-4" />;
  if (normalized === "audio") return <Music className="h-4 w-4" />;
  if (normalized === "document" || normalized === "file") return <FileText className="h-4 w-4" />;
  return <File className="h-4 w-4" />;
}

function formatMessageDate(value?: string | null) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  const now = new Date();
  const sameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
    date,
  );
  if (sameDate(date, now)) return `Hoje · ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDate(date, yesterday)) return `Ontem · ${time}`;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function fullDate(value?: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(
    new Date(value),
  );
}

function FileRow({ file, onOpen }: { file: LeadFile; onOpen: (file: LeadFile) => void }) {
  const name = fileLabel(file);
  return (
    <li>
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1.5 text-left hover:bg-muted"
        onClick={() => onOpen(file)}
        data-testid="lead-file-row"
      >
        <span className="shrink-0 text-muted-foreground">
          <FileIcon kind={file.kind} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium" title={name}>
            {name}
          </span>
          <span className="block text-[10px] text-muted-foreground">
            {formatMessageDate(file.messageCreatedAt)}
          </span>
        </span>
      </button>
    </li>
  );
}

function FilePreview({ file }: { file: LeadFile }) {
  const url = resolveAttachmentUrl(file.url);
  const kind = file.kind.toLowerCase();
  if (kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={fileLabel(file)}
        className="max-h-[55vh] w-full rounded-lg object-contain"
      />
    );
  }
  if (kind === "video") return <VideoMessageContent src={url} />;
  if (["audio", "voice", "ptt"].includes(kind)) {
    return <AudioMessageContent src={url} isVoice={kind !== "audio"} fileName={file.fileName} />;
  }
  return <DocumentMessageContent src={url} fileName={fileLabel(file)} fileSize={file.fileSize} />;
}

export function LeadFiles({
  dealId,
  leadName,
  onCountChange,
}: {
  dealId: string;
  leadName: string;
  onCountChange?: (count: number) => void;
}) {
  const queryClient = useQueryClient();
  const [allOpen, setAllOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<LeadFile | null>(null);
  const query = useQuery({
    queryKey: queryKeys.deals.files(dealId),
    queryFn: () => dealsApi.files(dealId),
  });
  const files = React.useMemo(() => query.data ?? [], [query.data]);
  React.useEffect(() => onCountChange?.(files.length), [files.length, onCountChange]);
  const remove = useMutation({
    mutationFn: (file: LeadFile) => dealsApi.removeFile(dealId, file.id),
    onSuccess: () => {
      setSelected(null);
      toast.success("Arquivo removido dos Arquivos.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.deals.files(dealId) });
    },
    onError: () => toast.error("Não foi possível remover o arquivo."),
  });

  if (query.isLoading) return <Skeleton className="h-16 w-full" />;
  return (
    <div className="space-y-2" data-testid="lead-files-section">
      {files.length ? (
        <ul className="space-y-0.5">
          {files.slice(0, 3).map((file) => (
            <FileRow key={file.id} file={file} onOpen={setSelected} />
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nenhum arquivo salvo.</p>
      )}
      {files.length ? (
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => setAllOpen(true)}
        >
          Ver todos os arquivos
        </button>
      ) : null}

      <Dialog
        open={allOpen}
        onOpenChange={setAllOpen}
        title={`Arquivos · ${leadName}`}
        description={`${files.length} arquivo(s) salvo(s)`}
        wide
      >
        <ul className="max-h-[65vh] space-y-1 overflow-y-auto pr-1">
          {files.map((file) => (
            <FileRow key={file.id} file={file} onOpen={setSelected} />
          ))}
        </ul>
      </Dialog>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected ? fileLabel(selected) : "Arquivo"}
        wide
      >
        {selected ? (
          <div className="space-y-4" data-testid="lead-file-preview">
            <FilePreview file={selected} />
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Tipo</dt>
                <dd>{selected.mimeType || selected.kind}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Tamanho</dt>
                <dd>{formatAttachmentSize(selected.fileSize)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Origem</dt>
                <dd>
                  {selected.messageDirection === "INBOUND"
                    ? "Recebido do cliente"
                    : "Enviado pela equipe"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Mensagem original</dt>
                <dd>{fullDate(selected.messageCreatedAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Salvo por</dt>
                <dd>{selected.savedBy?.name || "Usuário não disponível"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Salvo em</dt>
                <dd>{fullDate(selected.savedAt)}</dd>
              </div>
            </dl>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={remove.isPending}
                onClick={() => remove.mutate(selected)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remover dos Arquivos
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
