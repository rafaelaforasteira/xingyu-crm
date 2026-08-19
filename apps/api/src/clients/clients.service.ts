import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueryClientsDto } from "./dto/clients.dto";
import { customerStatus, isQualifyingPurchase, normalizeCountry, normalizeState, recencyBucket } from "./customer-profile.domain";

const orderInclude = { payments: true, items: true, owner: { select: { id: true, name: true, avatarUrl: true } }, deal: { include: { pipeline: true, stage: true } } } as const;
const contactInclude = { owner: { select: { id: true, name: true, avatarUrl: true } }, team: { select: { id: true, name: true } }, tags: { include: { tag: true } }, orders: { where: { deletedAt: null }, include: orderInclude }, deals: { where: { deletedAt: null }, include: { pipeline: true, stage: true, owner: true } }, tasks: { where: { deletedAt: null }, include: { assignee: true, statusDefinition: true } }, notes: { where: { deletedAt: null }, include: { author: true } }, activities: { include: { actor: true } } } as const;

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private async profiles(organizationId: string) {
    const [companies, contacts] = await Promise.all([
      this.prisma.company.findMany({ where: { organizationId, deletedAt: null }, include: { owner: { select: { id: true, name: true, avatarUrl: true } }, contacts: { where: { deletedAt: null }, include: contactInclude }, orders: { where: { deletedAt: null }, include: orderInclude }, deals: { where: { deletedAt: null }, include: { pipeline: true, stage: true, owner: true } }, tasks: { where: { deletedAt: null }, include: { assignee: true, statusDefinition: true } }, notes: { where: { deletedAt: null }, include: { author: true } }, activities: { include: { actor: true } } } }),
      this.prisma.contact.findMany({ where: { organizationId, deletedAt: null, companyId: null }, include: contactInclude }),
    ]);
    return [
      ...companies.map((company) => this.buildProfile("COMPANY" as const, company, company.contacts)),
      ...contacts.map((contact) => this.buildProfile("PERSON" as const, contact, [contact])),
    ];
  }

  private buildProfile(type: "COMPANY" | "PERSON", entity: any, contacts: any[]) {
    const directOrders = entity.orders ?? [];
    const orders = [...directOrders, ...contacts.flatMap((contact) => type === "COMPANY" ? contact.orders ?? [] : [])]
      .filter((order, index, all) => all.findIndex((item) => item.id === order.id) === index);
    const qualifyingOrders = orders.filter(isQualifyingPurchase).sort((a, b) => +new Date(a.orderedAt) - +new Date(b.orderedAt));
    const latest = qualifyingOrders.at(-1);
    const locationSource = entity.country || entity.state || entity.city ? entity : latest ? { country: latest.countryCodeSnapshot || latest.countrySnapshot, state: latest.provinceSnapshot, city: latest.citySnapshot, address: latest.formattedAddressSnapshot || latest.address1Snapshot } : entity;
    const state = normalizeState(locationSource.state);
    const country = normalizeCountry(locationSource.country, state);
    const lifetimeValue = qualifyingOrders.reduce((sum, order) => sum + Number(order.finalValue), 0);
    const units = qualifyingOrders.flatMap((order) => order.items ?? []).reduce((sum, item) => sum + item.quantity, 0);
    const deals = [...(entity.deals ?? []), ...contacts.flatMap((contact) => type === "COMPANY" ? contact.deals ?? [] : [])].filter((deal, i, all) => all.findIndex((row) => row.id === deal.id) === i);
    const tasks = [...(entity.tasks ?? []), ...contacts.flatMap((contact) => type === "COMPANY" ? contact.tasks ?? [] : [])].filter((task, i, all) => all.findIndex((row) => row.id === task.id) === i);
    const notes = [...(entity.notes ?? []), ...contacts.flatMap((contact) => type === "COMPANY" ? contact.notes ?? [] : [])].filter((note, i, all) => all.findIndex((row) => row.id === note.id) === i);
    const activities = [...(entity.activities ?? []), ...contacts.flatMap((contact) => type === "COMPANY" ? contact.activities ?? [] : [])].filter((activity, i, all) => all.findIndex((row) => row.id === activity.id) === i);
    return { profileId: `${type === "COMPANY" ? "company" : "contact"}:${entity.id}`, profileType: type, entityId: entity.id, name: type === "COMPANY" ? entity.tradeName || entity.legalName : [entity.firstName, entity.lastName].filter(Boolean).join(" "), email: entity.email ?? null, phone: entity.phone || entity.whatsapp || null, document: entity.cnpj || entity.cpf || null, owner: entity.owner ?? null, source: type === "PERSON" ? entity.source ?? null : contacts.find((c) => c.source)?.source ?? null, tags: contacts.flatMap((contact) => (contact.tags ?? []).map((row) => row.tag)).filter((tag, i, all) => all.findIndex((row) => row.id === tag.id) === i), location: { country, state: country === "BR" ? state : null, city: locationSource.city ?? null, address: locationSource.address ?? null }, status: customerStatus(qualifyingOrders.length), orderCount: qualifyingOrders.length, lifetimeValue, averageTicket: qualifyingOrders.length ? lifetimeValue / qualifyingOrders.length : 0, firstPurchaseAt: qualifyingOrders[0]?.orderedAt ?? null, lastPurchaseAt: latest?.orderedAt ?? null, recency: recencyBucket(latest?.orderedAt), units, openDeals: deals.filter((deal) => deal.status === "OPEN").length, contacts, orders: qualifyingOrders, deals, tasks, notes, activities: activities.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), createdAt: entity.createdAt };
  }

  async list(organizationId: string, query: QueryClientsDto) {
    const all = await this.profiles(organizationId);
    const q = query.search?.trim().toLocaleLowerCase("pt-BR");
    const filtered = all.filter((p) => (!q || [p.name, p.email, p.phone, p.document].some((v) => v?.toLocaleLowerCase("pt-BR").includes(q))) && (!query.status || p.status === query.status) && (!query.type || p.profileType === query.type) && (!query.ownerId || p.owner?.id === query.ownerId) && (!query.country || p.location.country === query.country) && (!query.state || p.location.state === query.state) && (!query.recency || p.recency === query.recency));
    const direction = query.sortOrder === "desc" ? -1 : 1;
    filtered.sort((a, b) => { const av: any = (a as any)[query.sortBy]; const bv: any = (b as any)[query.sortBy]; if (av == null) return 1; if (bv == null) return -1; return (typeof av === "string" ? av.localeCompare(bv) : av - bv) * direction; });
    const start = (query.page - 1) * query.pageSize;
    return { data: filtered.slice(start, start + query.pageSize).map(({ orders, deals, tasks, notes, activities, contacts, ...summary }) => summary), meta: { total: filtered.length, page: query.page, pageSize: query.pageSize, totalPages: Math.max(1, Math.ceil(filtered.length / query.pageSize)) } };
  }

  async dashboard(organizationId: string) {
    const profiles = await this.profiles(organizationId);
    const count = (predicate: (p: any) => boolean) => profiles.filter(predicate).length;
    const distribution = (key: (p: any) => string | null) => Object.entries(profiles.reduce<Record<string, number>>((acc, profile) => { const value = key(profile); if (value) acc[value] = (acc[value] ?? 0) + 1; return acc; }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    return { total: profiles.length, leads: count((p) => p.status === "LEAD"), customers: count((p) => p.status !== "LEAD"), recurring: count((p) => p.status === "RECURRING"), lifetimeValue: profiles.reduce((sum, p) => sum + p.lifetimeValue, 0), averageTicket: (() => { const orders = profiles.reduce((sum, p) => sum + p.orderCount, 0); return orders ? profiles.reduce((sum, p) => sum + p.lifetimeValue, 0) / orders : 0; })(), profile: [{ label: "Leads", value: count((p) => p.status === "LEAD"), filter: "LEAD" }, { label: "1 compra", value: count((p) => p.status === "CUSTOMER"), filter: "CUSTOMER" }, { label: "Recorrentes", value: count((p) => p.status === "RECURRING"), filter: "RECURRING" }], location: [{ label: "Brasil", value: count((p) => p.location.country === "BR"), filter: "BR" }, { label: "Exterior", value: count((p) => p.location.country && p.location.country !== "BR"), filter: "INTERNATIONAL" }, { label: "Sem localização", value: count((p) => !p.location.country), filter: "UNKNOWN" }], states: distribution((p) => p.location.country === "BR" ? p.location.state : null), countries: distribution((p) => p.location.country && p.location.country !== "BR" ? p.location.country : null), recency: distribution((p) => p.recency), owners: distribution((p) => p.owner?.name ?? "Sem responsável"), quality: { withoutPhone: count((p) => !p.phone), withoutEmail: count((p) => !p.email), withoutLocation: count((p) => !p.location.country), withoutOwner: count((p) => !p.owner) } };
  }

  async detail(organizationId: string, profileId: string) {
    const profile = (await this.profiles(organizationId)).find((item) => item.profileId === profileId);
    if (!profile) throw new NotFoundException("Cliente não encontrado");
    return profile;
  }
}
