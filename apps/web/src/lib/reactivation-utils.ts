import { normalizePaginatedResponse, safeDate, safeRelation } from "./normalizers";
import type {
  PaginatedResponse,
  ReactivationContact,
  ReactivationConversation,
  ReactivationExistingOpenDeal,
  ReactivationLead,
  ReactivationListQuery,
  ReactivationSegment,
  ReactivationStatus,
  ReactivationWorkflow,
  ReactivationWorkflowStatus,
  Team,
  UserRef,
} from "./types";

type UnknownRecord = Record<string, unknown>;

const REACTIVATION_STATUSES = new Set<ReactivationStatus>([
  "LEAD",
  "QUALIFIED",
  "ACTIVE_CUSTOMER",
  "INACTIVE",
  "ARCHIVED",
]);

const REACTIVATION_SEGMENTS = new Set<ReactivationSegment>([
  "lead_nunca_comprou",
  "comprou_uma_vez",
  "recorrente_parou",
  "cliente_sem_resposta",
]);

const REACTIVATION_WORKFLOW_STATUSES = new Set<ReactivationWorkflowStatus>([
  "APPROACHED",
  "POSTPONED",
  "DISCARDED",
  "CONVERTED",
]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function warnInvalid(detail: string) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn(`[Xingyu CRM] reactivation response: ${detail}`);
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableString(value: unknown) {
  return value === null || value === undefined ? null : stringValue(value);
}

function finiteNumber(value: unknown, fallback: number) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "string" && !value.trim())
  ) {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegativeInteger(value: unknown) {
  const number = finiteNumber(value, Number.NaN);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function scoreValue(value: unknown) {
  const number = nonNegativeInteger(value);
  return number !== null && number <= 100 ? number : null;
}

function normalizedDate(value: unknown, context: string) {
  const date = safeDate(value, context);
  return date?.toISOString() ?? null;
}

function isNamedRelation(
  value: unknown,
): value is { id: string; name: string } {
  if (!isRecord(value)) return false;
  return Boolean(stringValue(value.id) && stringValue(value.name));
}

function normalizeOwner(value: unknown): UserRef | null {
  const owner = safeRelation(value, isNamedRelation, "reactivation owner");
  return owner ? { id: owner.id, name: owner.name } : null;
}

function normalizeTeam(value: unknown): Team | null {
  const team = safeRelation(value, isNamedRelation, "reactivation team");
  return team ? { id: team.id, name: team.name } : null;
}

function normalizeContact(value: unknown): ReactivationContact | null {
  const contact = safeRelation(value, isRecord, "reactivation contact");
  if (!contact) return null;

  const id = stringValue(contact.id);
  const name = stringValue(contact.name);
  const firstName = stringValue(contact.firstName);
  if (!id || !name || !firstName) {
    warnInvalid("degraded an invalid contact relation to null");
    return null;
  }

  return {
    id,
    name,
    firstName,
    lastName: nullableString(contact.lastName),
    email: nullableString(contact.email),
    phone: nullableString(contact.phone),
    whatsapp: nullableString(contact.whatsapp),
    instagram: nullableString(contact.instagram),
    totalPurchased: finiteNumber(contact.totalPurchased, 0),
    averageTicket: finiteNumber(contact.averageTicket, 0),
    orderCount: nonNegativeInteger(contact.orderCount) ?? 0,
  };
}

function normalizeExistingOpenDeal(
  value: unknown,
): ReactivationExistingOpenDeal | null {
  const deal = safeRelation(value, isRecord, "reactivation existing open deal");
  if (!deal) return null;

  const id = stringValue(deal.id);
  const pipelineId = stringValue(deal.pipelineId);
  const stageId = stringValue(deal.stageId);
  if (!id || !pipelineId || !stageId) {
    warnInvalid("degraded an invalid existing open deal relation to null");
    return null;
  }

  return {
    id,
    pipelineId,
    stageId,
    conversationId: nullableString(deal.conversationId),
  };
}

function normalizeConversation(value: unknown): ReactivationConversation | null {
  const conversation = safeRelation(
    value,
    isRecord,
    "reactivation latest conversation",
  );
  if (!conversation) return null;

  const id = stringValue(conversation.id);
  const status = stringValue(conversation.status);
  if (!id || !status) {
    warnInvalid("degraded an invalid latest conversation relation to null");
    return null;
  }

  return {
    id,
    status,
    lastMessageAt: normalizedDate(
      conversation.lastMessageAt,
      "reactivation latest conversation lastMessageAt",
    ),
  };
}

function normalizeWorkflow(value: unknown): ReactivationWorkflow | null {
  const workflow = safeRelation(value, isRecord, "reactivation workflow");
  if (!workflow) return null;

  const status = stringValue(workflow.status);
  const actedAt = normalizedDate(
    workflow.actedAt,
    "reactivation workflow actedAt",
  );
  if (
    !status ||
    !REACTIVATION_WORKFLOW_STATUSES.has(status as ReactivationWorkflowStatus) ||
    !actedAt
  ) {
    warnInvalid("degraded an invalid workflow to null");
    return null;
  }

  return {
    status: status as ReactivationWorkflowStatus,
    actedAt,
    snoozedUntil: normalizedDate(
      workflow.snoozedUntil,
      "reactivation workflow snoozedUntil",
    ),
    reason: nullableString(workflow.reason),
    actor: normalizeOwner(workflow.actor),
  };
}

function normalizeReactivationItem(
  value: UnknownRecord,
): ReactivationLead | null {
  const id = stringValue(value.id);
  const score = scoreValue(value.score);
  const daysInactive = nonNegativeInteger(value.daysInactive);
  const status = stringValue(value.status);
  const classification = stringValue(value.classification);

  if (
    !id ||
    score === null ||
    daysInactive === null ||
    !status ||
    !REACTIVATION_STATUSES.has(status as ReactivationStatus) ||
    !classification ||
    !REACTIVATION_SEGMENTS.has(classification as ReactivationSegment)
  ) {
    warnInvalid("discarded an item with invalid required fields");
    return null;
  }

  const existingOpenDeal = normalizeExistingOpenDeal(value.existingOpenDeal);

  return {
    id,
    contact: normalizeContact(value.contact),
    score,
    reason: stringValue(value.reason) ?? "Critérios de reativação",
    status: status as ReactivationStatus,
    classification: classification as ReactivationSegment,
    daysInactive,
    lastInteractionAt: normalizedDate(
      value.lastInteractionAt,
      "reactivation lastInteractionAt",
    ),
    lastPurchaseAt: normalizedDate(
      value.lastPurchaseAt,
      "reactivation lastPurchaseAt",
    ),
    owner: normalizeOwner(value.owner),
    team: normalizeTeam(value.team),
    existingOpenDealId:
      nullableString(value.existingOpenDealId) ?? existingOpenDeal?.id ?? null,
    existingOpenDeal,
    latestConversation: normalizeConversation(value.latestConversation),
    workflow: normalizeWorkflow(value.workflow),
  };
}

export function normalizeReactivationResponse(
  response: unknown,
  query: Pick<ReactivationListQuery, "page" | "pageSize"> = {},
): PaginatedResponse<ReactivationLead> {
  const normalized = normalizePaginatedResponse(
    response,
    isRecord,
    {
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    },
  );
  return {
    data: normalized.data
      .map(normalizeReactivationItem)
      .filter((item): item is ReactivationLead => item !== null),
    meta: normalized.meta,
  };
}
