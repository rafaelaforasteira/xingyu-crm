export const AUTOMATION_LIMITS = {
  maxNodes: 120,
  maxEdges: 240,
  maxStepsPerExecution: 250,
  maxLoopIterations: 50,
  maxExecutionDepth: 5,
  maxPayloadBytes: 48_000,
  maxHttpResponseBytes: 256_000,
  maxWebhookPayloadBytes: 256_000,
  maxHttpTimeoutMs: 15_000,
  workerPollMs: 1_500,
  jobLeaseMs: 120_000,
  eventLeaseMs: 60_000,
  claimBatch: 12,
  expressionMaxLength: 4_000,
} as const;

export const EVENT_ORIGINS = ["USER", "SYSTEM", "AUTOMATION", "WEBHOOK", "INTEGRATION"] as const;
export type EventOrigin = (typeof EVENT_ORIGINS)[number];

export const EXECUTION_STATUSES = [
  "QUEUED",
  "RUNNING",
  "WAITING",
  "SUCCEEDED",
  "FAILED",
  "CANCELED",
  "TIMED_OUT",
  "SKIPPED",
] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const NODE_EXECUTION_STATUSES = [
  "PENDING",
  "RUNNING",
  "WAITING",
  "SUCCEEDED",
  "FAILED",
  "SKIPPED",
  "CANCELED",
] as const;

export const AUTOMATION_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED", "INACTIVE"] as const;

export const DOMAIN_EVENT_TYPES = {
  DEAL_CREATED: "deal.created",
  DEAL_STAGE_CHANGED: "deal.stage.changed",
  DEAL_OWNER_CHANGED: "deal.owner.changed",
  DEAL_TAG_ADDED: "deal.tag.added",
  DEAL_TAG_REMOVED: "deal.tag.removed",
  CONTACT_CREATED: "contact.created",
  ORDER_CREATED: "order.created",
  ORDER_STATUS_CHANGED: "order.status.changed",
  ORDER_PAYMENT_CONFIRMED: "order.payment.confirmed",
  ORDER_PAYMENT_FAILED: "order.payment.failed",
  MESSAGE_RECEIVED: "message.received",
  CONNECTION_CONNECTED: "connection.connected",
  CONNECTION_DISCONNECTED: "connection.disconnected",
  TASK_CREATED: "task.created",
  TASK_COMPLETED: "task.completed",
  WEBHOOK_RECEIVED: "webhook.received",
  MANUAL_RUN: "manual.run",
  SCHEDULE_TICK: "schedule.tick",
} as const;

export const LEGACY_TRIGGER_MAP: Record<string, string> = {
  DEAL_CREATED: DOMAIN_EVENT_TYPES.DEAL_CREATED,
  DEAL_STAGE_CHANGED: DOMAIN_EVENT_TYPES.DEAL_STAGE_CHANGED,
};

export const JOB_TYPES = {
  START_EXECUTION: "START_EXECUTION",
  CONTINUE: "CONTINUE",
  RESUME_WAIT: "RESUME_WAIT",
  WAIT_TIMEOUT: "WAIT_TIMEOUT",
  PROCESS_EVENT: "PROCESS_EVENT",
} as const;
