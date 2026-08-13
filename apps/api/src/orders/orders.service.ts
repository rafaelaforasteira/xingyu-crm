import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, OrderStageCategory } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateOrderDto,
  UpdateOrderDto,
  QueryOrdersDto,
  CreatePaymentDto,
  CreateShipmentDto,
  CreateOrderStageDto,
  UpdateOrderStageDto,
} from "./dto/order.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateRelations(
    organizationId: string,
    ids: { contactId?: string; companyId?: string; dealId?: string; ownerId?: string; operationalAssigneeId?: string },
  ) {
    const [contact, company, deal, owner, operationalAssignee] = await Promise.all([
      ids.contactId
        ? this.prisma.contact.findFirst({
            where: { id: ids.contactId, organizationId, ...notDeleted },
            select: { id: true },
          })
        : null,
      ids.companyId
        ? this.prisma.company.findFirst({
            where: { id: ids.companyId, organizationId, ...notDeleted },
            select: { id: true },
          })
        : null,
      ids.dealId
        ? this.prisma.deal.findFirst({
            where: { id: ids.dealId, organizationId, ...notDeleted },
            select: { id: true },
          })
        : null,
      ids.ownerId
        ? this.prisma.user.findFirst({
            where: { id: ids.ownerId, organizationId, ...notDeleted },
            select: { id: true },
          })
        : null,
      ids.operationalAssigneeId
        ? this.prisma.user.findFirst({ where: { id: ids.operationalAssigneeId, organizationId, status: "ACTIVE", ...notDeleted }, select: { id: true } })
        : null,
    ]);
    const invalid =
      (ids.contactId && !contact && "Contato") ||
      (ids.companyId && !company && "Empresa") ||
      (ids.dealId && !deal && "Negociação") ||
      (ids.ownerId && !owner && "Responsável");
    if (ids.operationalAssigneeId && !operationalAssignee) throw new BadRequestException("Responsável operacional inválido");
    if (invalid) throw new BadRequestException(`${invalid} inválido`);
  }

  async findAll(organizationId: string, query: QueryOrdersDto, allowedPipelineIds?: string[] | null) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.status ? { status: query.status } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.stageId ? { operationalStageId: query.stageId } : {}),
      ...(query.operationalAssigneeId ? { operationalAssigneeId: query.operationalAssigneeId } : {}),
      ...(query.financialStatus ? { financialStatus: query.financialStatus } : {}),
      ...(query.fulfillmentStatus ? { fulfillmentStatus: query.fulfillmentStatus } : {}),
      ...(query.priority ? { operationalPriority: query.priority } : {}),
      ...(query.issue ? { operationalIssue: true } : {}),
      ...(query.overdue ? { operationalDueAt: { lt: new Date() }, operationalStage: { isFinal: false } } : {}),
      ...(allowedPipelineIds ? { AND: [{ OR: [{ dealId: null }, { deal: { pipelineId: { in: allowedPipelineIds } } }] }] } : {}),
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: "insensitive" } },
              { observations: { contains: query.search, mode: "insensitive" } },
              { externalId: { contains: query.search, mode: "insensitive" } },
              { externalName: { contains: query.search, mode: "insensitive" } },
              { customerNameSnapshot: { contains: query.search, mode: "insensitive" } },
              { customerEmailSnapshot: { contains: query.search, mode: "insensitive" } },
              { customerPhoneSnapshot: { contains: query.search, mode: "insensitive" } },
              { trackingCode: { contains: query.search, mode: "insensitive" } },
              { items: { some: { sku: { contains: query.search, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy ?? "orderedAt"]: query.sortOrder ?? "desc" },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, legalName: true } },
          items: { include: { product: true } },
          payments: true,
          shipments: true,
          attributions: { orderBy: { createdAt: "asc" } },
          events: { orderBy: { occurredAt: "desc" } },
          owner: { select: { id: true, name: true, avatarUrl: true } },
          operationalAssignee: { select: { id: true, name: true, avatarUrl: true } },
          operationalStage: true,
          deal: { select: { id: true, name: true, leadSequence: true, pipelineId: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        contact: true,
        company: true,
        deal: true,
        items: { include: { product: true } },
        payments: true,
        shipments: true,
        attributions: { orderBy: { createdAt: "asc" } },
        events: { orderBy: { occurredAt: "desc" } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
        operationalAssignee: { select: { id: true, name: true, avatarUrl: true } },
        operationalStage: true,
      },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async create(organizationId: string, dto: CreateOrderDto, userId: string) {
    await this.ensureDefaultStages(organizationId);
    const { items, total, customerSnapshot, addressSnapshot, trackingSnapshot, ...data } = dto;
    const number = data.number?.trim() || data.externalName?.trim() || `ORD-${Date.now()}`;
    await this.validateRelations(organizationId, {
      contactId: data.contactId,
      companyId: data.companyId,
      dealId: data.dealId,
      ownerId: data.ownerId ?? userId,
      operationalAssigneeId: data.operationalAssigneeId,
    });
    const existingOrders = data.contactId
      ? await this.prisma.order.count({
          where: { organizationId, contactId: data.contactId, ...notDeleted },
        })
      : 0;
    const initialStage = data.operationalStageId ? null : await this.prisma.orderStageDefinition.findFirst({ where: { organizationId, isInitial: true, active: true, archived: false, deletedAt: null }, orderBy: { position: "asc" } });
    return this.prisma.order.create({
      data: {
        contactId: data.contactId,
        companyId: data.companyId,
        dealId: data.dealId,
        operationalStageId: data.operationalStageId ?? initialStage?.id,
        operationalAssigneeId: data.operationalAssigneeId ?? data.ownerId ?? userId,
        operationalPriority: data.operationalPriority as never,
        operationalDueAt: data.operationalDueAt ? new Date(data.operationalDueAt) : undefined,
        operationalIssue: data.operationalIssue,
        fulfillmentStatus: data.fulfillmentStatus,
        currentLocation: data.currentLocation,
        observations: data.notes,
        organizationId,
        number,
        orderedAt: data.orderedAt ? new Date(data.orderedAt) : undefined,
        channel: data.channel,
        source: data.source,
        campaign: data.campaign,
        status: (data.status as never) ?? "ORDER_PLACED",
        ownerId: data.ownerId ?? userId,
        currency: data.currency ?? "BRL",
        coupon: data.coupon,
        externalId: data.externalId,
        externalName: data.externalName,
        externalUrl: data.externalUrl,
        financialStatus: data.financialStatus,
        paymentGateway: data.paymentGateway,
        isFirstPurchase:
          data.isFirstPurchase ?? (data.contactId ? existingOrders === 0 : undefined),
        purchaseOrdinal: data.purchaseOrdinal ?? (data.contactId ? existingOrders + 1 : undefined),
        customerNameSnapshot: customerSnapshot?.name,
        customerEmailSnapshot: customerSnapshot?.email,
        customerPhoneSnapshot: customerSnapshot?.phone,
        recipientNameSnapshot: addressSnapshot?.recipientName,
        address1Snapshot: addressSnapshot?.address1,
        address2Snapshot: addressSnapshot?.address2,
        addressNumberSnapshot: addressSnapshot?.number,
        complementSnapshot: addressSnapshot?.complement,
        neighborhoodSnapshot: addressSnapshot?.neighborhood,
        citySnapshot: addressSnapshot?.city,
        provinceSnapshot: addressSnapshot?.province,
        postalCodeSnapshot: addressSnapshot?.postalCode,
        countrySnapshot: addressSnapshot?.country,
        countryCodeSnapshot: addressSnapshot?.countryCode,
        formattedAddressSnapshot: addressSnapshot?.formattedAddress,
        trackingSourceSnapshot: trackingSnapshot?.source,
        trackingMediumSnapshot: trackingSnapshot?.medium,
        trackingCampaignSnapshot: trackingSnapshot?.campaign,
        trackingContentSnapshot: trackingSnapshot?.content,
        trackingTermSnapshot: trackingSnapshot?.term,
        landingPageSnapshot: trackingSnapshot?.landingPage,
        referrerSnapshot: trackingSnapshot?.referrer,
        finalValue: total ?? 0,
        grossValue: data.grossValue ?? total ?? 0,
        discount: data.discount ?? 0,
        shippingCost: data.shippingCost ?? 0,
        taxes: data.taxes ?? 0,
        ...(items?.length
          ? {
              items: {
                create: items.map((item) => ({
                  productId: item.productId,
                  productName: item.productName ?? "Item",
                  sku: item.sku,
                  externalProductId: item.externalProductId,
                  externalVariantId: item.externalVariantId,
                  variantTitle: item.variantTitle,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice ?? 0,
                  totalPrice: (item.unitPrice ?? 0) * item.quantity,
                })),
              },
            }
          : {}),
      },
      include: {
        items: { include: { product: true } },
        payments: true,
        attributions: true,
        events: true,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateOrderDto) {
    const previous = await this.findOne(organizationId, id);
    await this.validateRelations(organizationId, {
      contactId: dto.contactId,
      companyId: dto.companyId,
      dealId: dto.dealId,
      ownerId: dto.ownerId,
      operationalAssigneeId: dto.operationalAssigneeId,
    });
    const {
      items: _items,
      total,
      customerSnapshot,
      addressSnapshot,
      trackingSnapshot,
      ...data
    } = dto;
    if (dto.operationalStageId) {
      const stage = await this.prisma.orderStageDefinition.findFirst({ where: { id: dto.operationalStageId, organizationId, deletedAt: null, archived: false } });
      if (!stage) throw new BadRequestException("Etapa operacional inválida");
    }
    return this.prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id },
      data: {
        ...data,
        ...(customerSnapshot
          ? {
              customerNameSnapshot: customerSnapshot.name,
              customerEmailSnapshot: customerSnapshot.email,
              customerPhoneSnapshot: customerSnapshot.phone,
            }
          : {}),
        ...(addressSnapshot
          ? {
              recipientNameSnapshot: addressSnapshot.recipientName,
              address1Snapshot: addressSnapshot.address1,
              address2Snapshot: addressSnapshot.address2,
              addressNumberSnapshot: addressSnapshot.number,
              complementSnapshot: addressSnapshot.complement,
              neighborhoodSnapshot: addressSnapshot.neighborhood,
              citySnapshot: addressSnapshot.city,
              provinceSnapshot: addressSnapshot.province,
              postalCodeSnapshot: addressSnapshot.postalCode,
              countrySnapshot: addressSnapshot.country,
              countryCodeSnapshot: addressSnapshot.countryCode,
              formattedAddressSnapshot: addressSnapshot.formattedAddress,
            }
          : {}),
        ...(trackingSnapshot
          ? {
              trackingSourceSnapshot: trackingSnapshot.source,
              trackingMediumSnapshot: trackingSnapshot.medium,
              trackingCampaignSnapshot: trackingSnapshot.campaign,
              trackingContentSnapshot: trackingSnapshot.content,
              trackingTermSnapshot: trackingSnapshot.term,
              landingPageSnapshot: trackingSnapshot.landingPage,
              referrerSnapshot: trackingSnapshot.referrer,
            }
          : {}),
        ...(total !== undefined ? { finalValue: total } : {}),
        ...(data.notes !== undefined ? { observations: data.notes, notes: undefined } : {}),
        status: data.status as never,
        ...(data.operationalDueAt !== undefined ? { operationalDueAt: data.operationalDueAt ? new Date(data.operationalDueAt) : null } : {}),
      } as Prisma.OrderUpdateInput,
      include: { items: { include: { product: true } }, payments: true, shipments: true },
    });
    if (dto.operationalStageId && dto.operationalStageId !== previous.operationalStageId) await tx.orderEvent.create({ data: { orderId: id, type: "OPERATIONAL_STAGE_CHANGED", title: "Etapa operacional alterada", metadata: { from: previous.operationalStageId, to: dto.operationalStageId } } });
    return updated;
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.order.update({ where: { id }, data: softDeleteData() });
  }

  async addPayment(organizationId: string, orderId: string, dto: CreatePaymentDto) {
    await this.findOne(organizationId, orderId);
    return this.prisma.payment.create({
      data: {
        orderId,
        amount: dto.amount,
        status: (dto.status as never) ?? "PENDING",
        method: (dto.method as never) ?? "PIX",
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        transactionCode: dto.reference,
        notes: dto.notes,
      } as never,
    });
  }

  async addShipment(organizationId: string, orderId: string, dto: CreateShipmentDto) {
    await this.findOne(organizationId, orderId);
    return this.prisma.shipment.create({
      data: {
        orderId,
        carrier: dto.carrier,
        trackingCode: dto.trackingCode,
        status: (dto.status as never) ?? "PENDING",
        notes: dto.notes,
        postedAt: dto.shippedAt ? new Date(dto.shippedAt) : undefined,
        expectedAt: dto.estimatedArrival ? new Date(dto.estimatedArrival) : undefined,
      } as never,
    });
  }

  async updateStatus(organizationId: string, id: string, status: string) {
    await this.findOne(organizationId, id);
    return this.prisma.order.update({ where: { id }, data: { status: status as never } });
  }
  private async ensureDefaultStages(organizationId: string) {
    const hasStages = await this.prisma.orderStageDefinition.count({ where: { organizationId, deletedAt: null } });
    const defaults = [
      ["new", "Novo pedido", "OPEN", "#64748B", true, false], ["review", "Conferência", "OPEN", "#F59E0B", false, false],
      ["production", "Em produção", "IN_PROGRESS", "#3B82F6", false, false], ["quality", "Controle de qualidade", "IN_PROGRESS", "#8B5CF6", false, false],
      ["ready", "Pronto para envio", "IN_PROGRESS", "#06B6D4", false, false], ["international", "China → Brasil", "IN_PROGRESS", "#0EA5E9", false, false],
      ["brazil", "Recebido no Brasil", "IN_PROGRESS", "#14B8A6", false, false], ["customer", "Enviado ao cliente", "IN_PROGRESS", "#22C55E", false, false],
      ["delivered", "Entregue", "DONE", "#16A34A", false, true], ["issue", "Problema / Pendência", "ISSUE", "#EF4444", false, false],
    ] as const;
    if (!hasStages) await this.prisma.orderStageDefinition.createMany({ data: defaults.map(([code, name, category, color, isInitial, isFinal], position) => ({ organizationId, code, name, category, color, isInitial, isFinal, position, translations: { en: name, "zh-CN": name, "zh-HK": name } })) });
    const initial = await this.prisma.orderStageDefinition.findFirst({ where: { organizationId, isInitial: true, active: true, archived: false, deletedAt: null }, orderBy: { position: "asc" } });
    if (initial) await this.prisma.order.updateMany({ where: { organizationId, operationalStageId: null, deletedAt: null }, data: { operationalStageId: initial.id } });
  }

  async stages(organizationId: string, includeArchived = false) {
    await this.ensureDefaultStages(organizationId);
    return this.prisma.orderStageDefinition.findMany({ where: { organizationId, deletedAt: null, ...(includeArchived ? {} : { active: true, archived: false }) }, orderBy: { position: "asc" } });
  }
  async createStage(organizationId: string, dto: CreateOrderStageDto) {
    const max = await this.prisma.orderStageDefinition.aggregate({ where: { organizationId, deletedAt: null }, _max: { position: true } });
    const code = dto.code?.trim() || dto.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return this.prisma.orderStageDefinition.create({ data: { organizationId, code, name: dto.name.trim(), color: dto.color, category: dto.category as OrderStageCategory, isInitial: dto.isInitial, isFinal: dto.isFinal, translations: dto.translations ?? {}, position: (max._max.position ?? -1) + 1 } });
  }
  async updateStage(organizationId: string, id: string, dto: UpdateOrderStageDto) {
    const found = await this.prisma.orderStageDefinition.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!found) throw new NotFoundException("Etapa operacional não encontrada");
    return this.prisma.orderStageDefinition.update({ where: { id }, data: { ...dto, category: dto.category as OrderStageCategory | undefined } });
  }
  async reorderStages(organizationId: string, ids: string[]) {
    await this.prisma.$transaction(ids.map((id, position) => this.prisma.orderStageDefinition.updateMany({ where: { id, organizationId, deletedAt: null }, data: { position } })));
    return this.stages(organizationId, true);
  }
}
