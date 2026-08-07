import type { PipelineStage } from "@/lib/types";

export function sortPipelineStages(stages: PipelineStage[]): PipelineStage[] {
  return [...stages].sort(
    (a, b) => (a.position ?? a.order ?? 0) - (b.position ?? b.order ?? 0),
  );
}

export function resolveStageLabel(options: {
  stages: PipelineStage[];
  stageId?: string | null;
  stageName?: string | null;
  hasDeal: boolean;
}): string {
  const { stages, stageId, stageName, hasDeal } = options;
  if (!hasDeal) return "Sem etapa";
  const fromList = stages.find((stage) => stage.id === stageId)?.name;
  if (fromList) return fromList;
  if (stageName?.trim()) return stageName.trim();
  return "Sem etapa";
}
