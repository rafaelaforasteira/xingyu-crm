import type { Activity } from "@/lib/types";

const labels: Record<string, string> = {
  DEAL_CREATED: "Lead criado",
  STAGE_CHANGED: "Moveu o lead",
  OWNER_CHANGED: "Alterou o responsável",
  NOTE_CREATED: "Adicionou uma nota",
  TASK_CREATED: "Criou uma tarefa",
  TASK_COMPLETED: "Concluiu uma tarefa",
  TASK_REOPENED: "Reabriu uma tarefa",
  FILE_SAVED: "Guardou um arquivo",
  FILE_REMOVED: "Removeu um arquivo",
  ORDER_CREATED: "Pedido identificado",
  TAG_ADDED: "Adicionou uma tag",
};

export function presentHistoryEvent(event: Activity) {
  const metadata = event.metadata ?? {};
  let detail: string | null = null;
  if (event.type === "STAGE_CHANGED") detail = `${String(metadata.fromStageName ?? "Etapa anterior")} → ${String(metadata.stageName ?? "Nova etapa")}`;
  else if (event.type === "OWNER_CHANGED") detail = `${String(metadata.fromOwnerName ?? "Não atribuído")} → ${String(metadata.toOwnerName ?? "Não atribuído")}`;
  return { label: labels[event.type] ?? "Acontecimento registrado", detail };
}
