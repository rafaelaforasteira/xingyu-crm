import {
  toCompanyResponse,
  type CompanyMapperInput,
} from "./company.mapper";
import {
  toContactResponse,
  type ContactMapperInput,
} from "./contact.mapper";
import { toNumber } from "./decimal";
import { flattenTags, type TagJunction, type TagRef } from "./tags";
import {
  toPipelineStageResponse,
  type PipelineStageMapperInput,
} from "./pipeline.mapper";

export type DealMapperInput = {
  id: string;
  name: string;
  value?: unknown;
  unreadMessages?: number;
  pipelineId: string;
  stageId: string;
  contactId?: string | null;
  companyId?: string | null;
  ownerId?: string | null;
  status?: string;
  priority?: string;
  lastInteractionAt?: Date | string | null;
  conversationId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  tags?: TagJunction[] | null;
  contact?: ContactMapperInput | null;
  company?: CompanyMapperInput | null;
  owner?: { id: string; name: string; avatarUrl?: string | null } | null;
  stage?: PipelineStageMapperInput | null;
  [key: string]: unknown;
};

export type DealResponse = {
  id: string;
  name: string;
  value: number;
  unreadCount: number;
  unreadMessages?: number;
  pipelineId: string;
  stageId: string;
  contactId: string | null;
  companyId: string | null;
  ownerId: string | null;
  contact: ReturnType<typeof toContactResponse> | null;
  company: ReturnType<typeof toCompanyResponse> | null;
  owner?: { id: string; name: string; avatarUrl?: string | null } | null;
  stage?: ReturnType<typeof toPipelineStageResponse> | null;
  tags: TagRef[];
  status?: string;
  priority?: string;
  lastInteractionAt: Date | string | null;
  conversationId: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  [key: string]: unknown;
};

export function toDealResponse(deal: DealMapperInput): DealResponse {
  const {
    value,
    unreadMessages = 0,
    tags,
    contact,
    company,
    stage,
    ...rest
  } = deal;

  return {
    ...rest,
    id: deal.id,
    name: deal.name,
    pipelineId: deal.pipelineId,
    stageId: deal.stageId,
    value: toNumber(value),
    unreadMessages,
    unreadCount: unreadMessages,
    contactId: deal.contactId ?? null,
    companyId: deal.companyId ?? null,
    ownerId: deal.ownerId ?? null,
    contact: contact ? toContactResponse(contact) : null,
    company: company ? toCompanyResponse(company) : null,
    stage: stage ? toPipelineStageResponse(stage) : null,
    tags: flattenTags(tags),
    lastInteractionAt: deal.lastInteractionAt ?? null,
    conversationId: deal.conversationId ?? null,
  };
}
