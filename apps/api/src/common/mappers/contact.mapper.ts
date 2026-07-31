import { toCompanyResponse, type CompanyMapperInput } from "./company.mapper";
import { toNumber } from "./decimal";
import { fullName } from "./names";
import { flattenTags, type TagJunction, type TagRef } from "./tags";

export type ContactMapperInput = {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  companyId?: string | null;
  ownerId?: string | null;
  teamId?: string | null;
  type?: string;
  status?: string;
  source?: string | null;
  observations?: string | null;
  totalPurchased?: unknown;
  averageTicket?: unknown;
  orderCount?: number;
  lastInteractionAt?: Date | string | null;
  firstInteractionAt?: Date | string | null;
  lastPurchaseAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  tags?: TagJunction[] | null;
  company?: CompanyMapperInput | null;
  owner?: { id: string; name: string; avatarUrl?: string | null } | null;
  /** Prisma Note[] relation — stripped in favor of observations→notes string */
  notes?: unknown;
  deals?: unknown;
  [key: string]: unknown;
};

export type ContactResponse = {
  id: string;
  firstName: string;
  lastName: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  companyId: string | null;
  company: ReturnType<typeof toCompanyResponse> | null;
  ownerId: string | null;
  owner?: { id: string; name: string; avatarUrl?: string | null } | null;
  teamId?: string | null;
  type?: string;
  status?: string;
  source: string | null;
  notes: string | null;
  observations?: string | null;
  tags: TagRef[];
  lastInteractionAt: Date | string | null;
  totalPurchased: number;
  averageTicket: number;
  orderCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deals?: unknown;
  [key: string]: unknown;
};

export function toContactResponse(
  contact: ContactMapperInput,
): ContactResponse {
  const {
    firstName,
    lastName = null,
    observations = null,
    tags,
    company,
    totalPurchased,
    averageTicket,
    notes: _notesRelation,
    lastInteractionAt,
    ...rest
  } = contact;

  return {
    ...rest,
    id: contact.id,
    firstName,
    lastName,
    name: fullName(firstName, lastName),
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    whatsapp: contact.whatsapp ?? null,
    companyId: contact.companyId ?? null,
    company: company ? toCompanyResponse(company) : null,
    ownerId: contact.ownerId ?? null,
    source: contact.source ?? null,
    observations,
    notes: observations ?? null,
    tags: flattenTags(tags),
    lastInteractionAt: lastInteractionAt ?? null,
    totalPurchased: toNumber(totalPurchased),
    averageTicket: toNumber(averageTicket),
  };
}
