export type ConditionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "CONTAINS"
  | "NOT_CONTAINS"
  | "STARTS_WITH"
  | "ENDS_WITH"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "GREATER_OR_EQUAL"
  | "LESS_OR_EQUAL"
  | "IS_EMPTY"
  | "IS_NOT_EMPTY"
  | "IS_ANY_OF"
  | "IS_NONE_OF"
  | "BEFORE"
  | "AFTER";

export interface ConditionItem {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
}

export interface ConditionGroup {
  logic?: "AND" | "OR";
  items: ConditionItem[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  label?: string;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}

export interface WorkflowFrame {
  id: string;
  label: string;
  description?: string;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkflowAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  color?: string;
}

export interface WorkflowSettings {
  reentry?: "always" | "once" | "cooldown" | "skipIfActive" | "replace";
  cooldownMinutes?: number;
  concurrency?: "allow" | "skipIfActive" | "queue" | "replace" | "debounce";
  executionWindow?: "always" | "businessHours" | "custom";
  timezone?: string;
  maxRetries?: number;
  backoff?: "fixed" | "exponential";
  timeoutMinutes?: number;
  allowAutomationReentry?: boolean;
}

export interface WorkflowDefinition {
  schemaVersion: 1;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
  frames?: WorkflowFrame[];
  annotations?: WorkflowAnnotation[];
  settings?: WorkflowSettings;
}

export interface WorkflowValidationIssue {
  level: "error" | "warning";
  code: string;
  message: string;
  nodeId?: string;
}

export function emptyDefinition(): WorkflowDefinition {
  return { schemaVersion: 1, nodes: [], edges: [], frames: [], annotations: [], settings: { reentry: "skipIfActive" } };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseDefinition(value: unknown): WorkflowDefinition {
  if (!isRecord(value)) return emptyDefinition();
  const nodes = Array.isArray(value.nodes) ? (value.nodes as WorkflowNode[]) : [];
  const edges = Array.isArray(value.edges) ? (value.edges as WorkflowEdge[]) : [];
  return {
    schemaVersion: 1,
    nodes,
    edges,
    viewport: isRecord(value.viewport) ? (value.viewport as WorkflowDefinition["viewport"]) : undefined,
    frames: Array.isArray(value.frames) ? (value.frames as WorkflowFrame[]) : [],
    annotations: Array.isArray(value.annotations) ? (value.annotations as WorkflowAnnotation[]) : [],
    settings: isRecord(value.settings) ? (value.settings as WorkflowSettings) : { reentry: "skipIfActive" },
  };
}
