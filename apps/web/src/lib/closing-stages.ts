import type { PipelineStage } from "./types";

export type ClosingKind = "WON" | "LOST";

export const CLOSING_DEFAULTS: Record<ClosingKind, { name: string; color: string; label: string }> = {
  WON: { name: "Ganho", color: "#10B981", label: "Coluna de ganho" },
  LOST: { name: "Perdido", color: "#EF4444", label: "Coluna de perdido" },
};

export function stageKind(stage: Pick<PipelineStage, "type" | "isWon" | "isLost">): "OPEN" | ClosingKind {
  if (stage.type === "WON" || stage.isWon) return "WON";
  if (stage.type === "LOST" || stage.isLost) return "LOST";
  return "OPEN";
}

const byPosition = (a: PipelineStage, b: PipelineStage) => a.position - b.position;

/**
 * Separa as etapas ativas: a primeira de ganho e a primeira de perdido viram as
 * "colunas de encerramento"; todo o resto (inclusive eventuais etapas extras de
 * ganho/perdido) fica na lista normal de etapas.
 */
export function splitClosingStages(stages: PipelineStage[]) {
  const sorted = [...stages].sort(byPosition);
  const won = sorted.find((stage) => stageKind(stage) === "WON") ?? null;
  const lost = sorted.find((stage) => stageKind(stage) === "LOST") ?? null;
  const working = sorted.filter((stage) => stage !== won && stage !== lost);
  return { working, won, lost };
}

/** Ordem final do quadro: etapas de trabalho, depois ganho, depois perdido. */
export function orderWithClosingLast(stages: PipelineStage[], workingOrder?: string[]): string[] {
  const { working, won, lost } = splitClosingStages(stages);
  const workingIds = workingOrder ?? working.map((stage) => stage.id);
  return [...workingIds, ...(won ? [won.id] : []), ...(lost ? [lost.id] : [])];
}

/** Coluna arquivada que pode ser reativada (a mais recente de cada tipo). */
export function findArchivedClosing(archived: PipelineStage[], kind: ClosingKind): PipelineStage | null {
  return (
    [...archived]
      .filter((stage) => stageKind(stage) === kind)
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0] ?? null
  );
}

export function needsReorder(stages: PipelineStage[]): boolean {
  const current = [...stages].sort(byPosition).map((stage) => stage.id);
  const desired = orderWithClosingLast(stages);
  return current.some((id, index) => id !== desired[index]);
}
