import { companyDisplayName } from "./names";
import { toNumber } from "./decimal";

export type CompanyMapperInput = {
  id: string;
  organizationId?: string;
  ownerId?: string | null;
  legalName: string;
  tradeName?: string | null;
  cnpj?: string | null;
  segment?: string | null;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  status?: string;
  totalPurchased?: unknown;
  averageTicket?: unknown;
  lastPurchaseAt?: Date | string | null;
  observations?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
  owner?: { id: string; name: string; avatarUrl?: string | null } | null;
  _count?: { contacts?: number; deals?: number };
  contacts?: unknown;
  deals?: unknown;
  [key: string]: unknown;
};

export type CompanyResponse = {
  id: string;
  name: string;
  legalName: string;
  tradeName: string | null;
  document: string | null;
  cnpj: string | null;
  segment: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status?: string;
  observations: string | null;
  notes: string | null;
  totalPurchased: number;
  averageTicket: number;
  lastPurchaseAt: Date | string | null;
  ownerId: string | null;
  owner?: { id: string; name: string; avatarUrl?: string | null } | null;
  contactsCount?: number;
  dealsCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  contacts?: unknown;
  deals?: unknown;
  [key: string]: unknown;
};

export function toCompanyResponse(
  company: CompanyMapperInput,
): CompanyResponse {
  const {
    legalName,
    tradeName = null,
    cnpj = null,
    segment = null,
    observations = null,
    totalPurchased,
    averageTicket,
    _count,
    contacts,
    deals,
    ...rest
  } = company;

  const response: CompanyResponse = {
    ...rest,
    id: company.id,
    legalName,
    tradeName,
    name: companyDisplayName(legalName, tradeName),
    document: cnpj,
    cnpj,
    segment,
    industry: segment,
    email: company.email ?? null,
    phone: company.phone ?? null,
    website: company.website ?? null,
    city: company.city ?? null,
    state: company.state ?? null,
    country: company.country ?? null,
    observations,
    notes: observations,
    totalPurchased: toNumber(totalPurchased),
    averageTicket: toNumber(averageTicket),
    lastPurchaseAt: company.lastPurchaseAt ?? null,
    ownerId: company.ownerId ?? null,
  };

  if (_count) {
    if (typeof _count.contacts === "number") {
      response.contactsCount = _count.contacts;
    }
    if (typeof _count.deals === "number") {
      response.dealsCount = _count.deals;
    }
  }

  if (contacts !== undefined) {
    response.contacts = contacts;
  }
  if (deals !== undefined) {
    response.deals = deals;
  }

  return response;
}
