export const AUTOMATION_TRIGGERS = ["DEAL_CREATED", "DEAL_STAGE_CHANGED"] as const;
export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number];

export const AUTOMATION_ACTIONS = [
  "CREATE_TASK",
  "MOVE_STAGE",
  "ASSIGN_OWNER",
  "ADD_TAG",
  "CREATE_NOTIFICATION",
] as const;
export type AutomationActionType = (typeof AUTOMATION_ACTIONS)[number];

export const AUTOMATION_CONDITION_OPERATORS = [
  "EQUALS",
  "NOT_EQUALS",
  "GREATER_THAN",
  "LESS_THAN",
  "CONTAINS",
  "IS_EMPTY",
  "IS_NOT_EMPTY",
] as const;
export type AutomationConditionOperator = (typeof AUTOMATION_CONDITION_OPERATORS)[number];

export interface AutomationCondition {
  field: string;
  operator: AutomationConditionOperator;
  value?: unknown;
}

export interface AutomationAction {
  id?: string;
  type: AutomationActionType;
  config: Record<string, unknown>;
}

export interface AutomationConfig {
  triggerConfig: {
    pipelineId?: string;
    fromStageId?: string;
    toStageId?: string;
  };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export interface AutomationEvent {
  organizationId: string;
  type: AutomationTrigger;
  dealId: string;
  actorId?: string | null;
  pipelineId: string;
  stageId: string;
  fromStageId?: string | null;
  ancestry?: string[];
  depth?: number;
}

export interface AutomationDispatchResult {
  matched: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

