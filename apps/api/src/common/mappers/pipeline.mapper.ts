export type PipelineStageMapperInput = {
  id: string;
  pipelineId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  position: number;
  /** @deprecated prefer position — kept only if legacy payloads still send it */
  order?: number;
  type?: string;
  isInitial?: boolean;
  isWon?: boolean;
  isLost?: boolean;
  maxDaysInStage?: number | null;
  probability?: number | null;
  archived?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
};

export type PipelineStageResponse = {
  id: string;
  pipelineId: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
  type?: string;
  isInitial: boolean;
  isWon: boolean;
  isLost: boolean;
  maxDaysInStage: number | null;
  probability: number | null;
  archived: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type PipelineMapperInput = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  isDefault?: boolean;
  archived?: boolean;
  favorited?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  stages?: PipelineStageMapperInput[] | null;
  _count?: { stages?: number; deals?: number };
  [key: string]: unknown;
};

export type PipelineResponse = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isDefault: boolean;
  archived: boolean;
  favorited?: boolean;
  stages?: PipelineStageResponse[];
  stagesCount?: number;
  dealsCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
};

export function toPipelineStageResponse(
  stage: PipelineStageMapperInput,
): PipelineStageResponse {
  const position =
    typeof stage.position === "number"
      ? stage.position
      : typeof stage.order === "number"
        ? stage.order
        : 0;

  return {
    id: stage.id,
    pipelineId: stage.pipelineId,
    name: stage.name,
    description: stage.description ?? null,
    color: stage.color ?? null,
    position,
    type: stage.type,
    isInitial: Boolean(stage.isInitial),
    isWon: Boolean(stage.isWon),
    isLost: Boolean(stage.isLost),
    maxDaysInStage: stage.maxDaysInStage ?? null,
    probability: stage.probability ?? null,
    archived: Boolean(stage.archived),
    createdAt: stage.createdAt,
    updatedAt: stage.updatedAt,
  };
}

export function toPipelineResponse(pipeline: PipelineMapperInput): PipelineResponse {
  const { stages, _count, ...rest } = pipeline;
  const response: PipelineResponse = {
    ...rest,
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description ?? null,
    color: pipeline.color ?? null,
    isDefault: Boolean(pipeline.isDefault),
    archived: Boolean(pipeline.archived),
    favorited: pipeline.favorited,
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
  };

  if (stages) {
    response.stages = stages
      .map(toPipelineStageResponse)
      .sort((a, b) => a.position - b.position);
  }
  if (_count) {
    if (typeof _count.stages === "number") response.stagesCount = _count.stages;
    if (typeof _count.deals === "number") response.dealsCount = _count.deals;
  }

  return response;
}
