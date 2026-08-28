import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, OrderStageCategory } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import { validateAndSaveUpload } from "../common/upload/upload.util";
import {
  CreateOrderDto,
  UpdateOrderDto,
  QueryOrdersDto,
  CreatePaymentDto,
  CreateShipmentDto,
  UpdateShipmentDto,
  CreateShipmentEventDto,
  CreateOrderStageDto,
  UpdateOrderStageDto,
} from "./dto/order.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateRelations(
    organizationId: string,
    ids: {
      contactId?: string;
      companyId?: string;
      dealId?: string;
      ownerId?: string;
      operationalAssigneeId?: string;
    },
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
        ? this.prisma.user.findFirst({
            where: {
              id: ids.operationalAssigneeId,
              organizationId,
              status: "ACTIVE",
              ...notDeleted,
            },
            select: { id: true },
          })
        : null,
    ]);
    const invalid =
      (ids.contactId && !contact && "Contato") ||
      (ids.companyId && !company && "Empresa") ||
      (ids.dealId && !deal && "Negociação") ||
      (ids.ownerId && !owner && "Responsável");
    if (ids.operationalAssigneeId && !operationalAssignee)
      throw new BadRequestException("Responsável operacional inválido");
    if (invalid) throw new BadRequestException(`${invalid} inválido`);
  }

  async findAll(
    organizationId: string,
    query: QueryOrdersDto,
    allowedPipelineIds?: string[] | null,
    scopedUserId?: string,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...((scopedUserId || allowedPipelineIds) ? { AND: [
        ...(scopedUserId ? [{ OR: [{ ownerId: scopedUserId }, { operationalAssigneeId: scopedUserId }, { deal: { ownerId: scopedUserId } }] }] : []),
        ...(allowedPipelineIds ? [{ OR: [{ dealId: null }, { deal: { pipelineId: { in: allowedPipelineIds } } }] }] : []),
      ] } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.stageId ? { operationalStageId: query.stageId } : {}),
      ...(query.operationalAssigneeId
        ? { operationalAssigneeId: query.operationalAssigneeId }
        : {}),
      ...(query.financialStatus ? { financialStatus: query.financialStatus } : {}),
      ...(query.fulfillmentStatus ? { fulfillmentStatus: query.fulfillmentStatus } : {}),
      ...(query.priority ? { operationalPriority: query.priority } : {}),
      ...(query.issue ? { operationalIssue: true } : {}),
      ...(query.overdue
        ? { operationalDueAt: { lt: new Date() }, operationalStage: { isFinal: false } }
        : {}),
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
          shipments: { orderBy: { createdAt: "desc" } },
          attributions: { orderBy: { createdAt: "asc" } },
          events: { orderBy: { occurredAt: "desc" } },
          owner: { select: { id: true, name: true, avatarUrl: true } },
          operationalAssignee: { select: { id: true, name: true, avatarUrl: true } },
          operationalStage: true,
          deal: {
            select: {
              id: true,
              name: true,
              leadSequence: true,
              pipelineId: true,
              owner: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
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
        contact: {
          include: {
            owner: { select: { id: true, name: true, avatarUrl: true } },
            tags: { include: { tag: true }, orderBy: { createdAt: "asc" }, take: 4 },
          },
        },
        company: { include: { owner: { select: { id: true, name: true, avatarUrl: true } } } },
        deal: {
          include: {
            owner: { select: { id: true, name: true, avatarUrl: true } },
            pipeline: { select: { id: true, name: true } },
            stage: { select: { id: true, name: true, color: true } },
            conversation: {
              select: {
                id: true,
                status: true,
                channel: { select: { id: true, type: true, name: true, displayName: true } },
              },
            },
          },
        },
        items: { include: { product: true } },
        payments: true,
        shipments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { events: { orderBy: { occurredAt: "desc" } } },
        },
        attributions: { orderBy: { createdAt: "asc" } },
        events: { orderBy: { occurredAt: "desc" } },
        owner: { select: { id: true, name: true, avatarUrl: true } },
        operationalAssignee: { select: { id: true, name: true, avatarUrl: true } },
        operationalStage: true,
      },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return {
      ...order,
      contact: order.contact
        ? { ...order.contact, tags: order.contact.tags.map(({ tag }) => tag) }
        : null,
    };
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
    if (data.operationalStageId) {
      const stage = await this.prisma.orderStageDefinition.findFirst({
        where: {
          id: data.operationalStageId,
          organizationId,
          active: true,
          archived: false,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!stage) throw new BadRequestException("Etapa operacional inválida ou arquivada");
    }
    const existingOrders = data.contactId
      ? await this.prisma.order.count({
          where: { organizationId, contactId: data.contactId, ...notDeleted },
        })
      : 0;
    const initialStage = data.operationalStageId
      ? null
      : await this.prisma.orderStageDefinition.findFirst({
          where: {
            organizationId,
            isInitial: true,
            active: true,
            archived: false,
            deletedAt: null,
          },
          orderBy: { position: "asc" },
        });
    const created = await this.prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
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
        events: {
          create: {
            type: "ORDER_CREATED",
            title: "Pedido criado",
            description: "Pedido criado manualmente no CRM",
          },
        },
      },
      include: {
        items: { include: { product: true } },
        payments: true,
        attributions: true,
        events: true,
      },
    });
    await tx.automationDomainEvent.create({
      data: {
        organizationId,
        eventType: "order.created",
        aggregateType: "order",
        aggregateId: order.id,
        origin: "USER",
        actorId: userId,
        payload: {
          orderId: order.id,
          dealId: order.dealId,
          contactId: order.contactId,
          status: order.status,
          number: order.number,
        },
        subjectType: "order",
        subjectId: order.id,
      },
    });
    return order;
    });
    return created;
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
      const stage = await this.prisma.orderStageDefinition.findFirst({
        where: { id: dto.operationalStageId, organizationId, deletedAt: null, archived: false },
      });
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
          ...(data.operationalDueAt !== undefined
            ? { operationalDueAt: data.operationalDueAt ? new Date(data.operationalDueAt) : null }
            : {}),
        } as Prisma.OrderUpdateInput,
        include: { items: { include: { product: true } }, payments: true, shipments: true },
      });
      if (dto.operationalStageId && dto.operationalStageId !== previous.operationalStageId)
        await tx.orderEvent.create({
          data: {
            orderId: id,
            type: "OPERATIONAL_STAGE_CHANGED",
            title: "Etapa operacional alterada",
            metadata: { from: previous.operationalStageId, to: dto.operationalStageId },
          },
        });
      if (dto.financialStatus !== undefined && dto.financialStatus !== previous.financialStatus)
        await tx.orderEvent.create({
          data: {
            orderId: id,
            type: "FINANCIAL_STATUS_CHANGED",
            title: "FINANCIAL_STATUS_CHANGED",
            metadata: {
              from: previous.financialStatus ?? previous.status,
              to: dto.financialStatus,
            },
          },
        });
      if (customerSnapshot)
        await tx.orderEvent.create({
          data: {
            orderId: id,
            type: "ORDER_CUSTOMER_DETAILS_UPDATED",
            title: "ORDER_CUSTOMER_DETAILS_UPDATED",
            metadata: { fields: Object.keys(customerSnapshot) },
          },
        });
      if (addressSnapshot)
        await tx.orderEvent.create({
          data: {
            orderId: id,
            type: "ORDER_SHIPPING_ADDRESS_UPDATED",
            title: "ORDER_SHIPPING_ADDRESS_UPDATED",
            metadata: { fields: Object.keys(addressSnapshot) },
          },
        });
      const operationalChanges = [
        ["OPERATIONAL_ASSIGNEE_CHANGED", dto.operationalAssigneeId, previous.operationalAssigneeId],
        ["OPERATIONAL_PRIORITY_CHANGED", dto.operationalPriority, previous.operationalPriority],
        [
          "OPERATIONAL_DUE_DATE_CHANGED",
          dto.operationalDueAt,
          previous.operationalDueAt?.toISOString(),
        ],
        ["CURRENT_LOCATION_CHANGED", dto.currentLocation, previous.currentLocation],
        ["OPERATIONAL_ISSUE_CHANGED", dto.operationalIssue, previous.operationalIssue],
      ] as const;
      for (const [type, next, before] of operationalChanges) {
        if (next !== undefined && String(next ?? "") !== String(before ?? "")) {
          await tx.orderEvent.create({
            data: {
              orderId: id,
              type,
              title: type,
              metadata: { from: before ?? null, to: next ?? null },
            },
          });
        }
      }
      if (data.status !== undefined && data.status !== previous.status) {
        await tx.automationDomainEvent.create({
          data: {
            organizationId,
            eventType: "order.status.changed",
            aggregateType: "order",
            aggregateId: id,
            origin: "USER",
            payload: { orderId: id, from: previous.status, to: data.status, dealId: previous.dealId, contactId: previous.contactId },
            subjectType: "order",
            subjectId: id,
          },
        });
      }
      return updated;
    });
  }

  async updateItemSeparation(
    organizationId: string,
    orderId: string,
    itemId: string,
    isSeparated: boolean,
  ) {
    const item = await this.prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId,
        order: { organizationId, ...notDeleted },
      },
      select: { id: true },
    });
    if (!item) throw new NotFoundException(`Order item ${itemId} not found in order ${orderId}`);
    return this.prisma.orderItem.update({
      where: { id: item.id },
      data: { isSeparated, separatedAt: isSeparated ? new Date() : null },
      include: { product: true },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.order.update({ where: { id }, data: softDeleteData() });
  }

  async addPayment(organizationId: string, orderId: string, dto: CreatePaymentDto) {
    await this.findOne(organizationId, orderId);
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
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
      const eventType = dto.status === "APPROVED" || dto.status === "PAID"
        ? "order.payment.confirmed"
        : dto.status === "DECLINED" || dto.status === "CANCELLED"
          ? "order.payment.failed"
          : null;
      if (eventType) {
        await tx.automationDomainEvent.create({
          data: {
            organizationId,
            eventType,
            aggregateType: "order",
            aggregateId: orderId,
            origin: "USER",
            payload: { orderId, paymentId: payment.id, status: dto.status },
            subjectType: "order",
            subjectId: orderId,
            deduplicationKey: `payment:${payment.id}:${eventType}`,
          },
        });
      }
      return payment;
    });
  }

  async uploadPaymentReceipt(
    organizationId: string,
    orderId: string,
    paymentId: string,
    file: Express.Multer.File,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        orderId,
        deletedAt: null,
        order: { organizationId, ...notDeleted },
      },
    });
    if (!payment) throw new NotFoundException("Pagamento não encontrado neste pedido.");
    if (payment.receiptUrl) {
      throw new BadRequestException("Este pagamento já possui um comprovante.");
    }
    const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (!file || !allowedMimeTypes.has(file.mimetype.toLowerCase())) {
      throw new BadRequestException("Envie um comprovante em PDF, JPG ou PNG.");
    }
    const saved = validateAndSaveUpload(file);
    return this.prisma.payment.update({
      where: { id: payment.id },
      data: { receiptUrl: saved.url },
    });
  }

  async addShipment(organizationId: string, orderId: string, dto: CreateShipmentDto) {
    await this.findOne(organizationId, orderId);
    return this.prisma.shipment.create({
      data: {
        orderId,
        carrier: dto.carrier,
        trackingCode: dto.trackingCode,
        trackingIssuedAt: dto.trackingCode?.trim() ? new Date() : undefined,
        status: (dto.status as never) ?? "PENDING",
        notes: dto.notes,
        postedAt: dto.shippedAt ? new Date(dto.shippedAt) : undefined,
        expectedAt: dto.estimatedArrival ? new Date(dto.estimatedArrival) : undefined,
      } as never,
    });
  }

  async updateShipment(
    organizationId: string,
    orderId: string,
    shipmentId: string,
    dto: UpdateShipmentDto,
  ) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, orderId, deletedAt: null, order: { organizationId, ...notDeleted } },
    });
    if (!shipment)
      throw new NotFoundException(`Shipment ${shipmentId} not found in order ${orderId}`);
    const trackingCode = dto.trackingCode !== undefined ? dto.trackingCode.trim() : undefined;
    return this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        ...(trackingCode !== undefined ? { trackingCode } : {}),
        ...(trackingCode && !shipment.trackingIssuedAt ? { trackingIssuedAt: new Date() } : {}),
        ...(dto.postedAt !== undefined
          ? { postedAt: dto.postedAt ? new Date(dto.postedAt) : null }
          : {}),
      },
      include: { events: { orderBy: { occurredAt: "desc" } } },
    });
  }

  async addShipmentEvent(
    organizationId: string,
    orderId: string,
    shipmentId: string,
    dto: CreateShipmentEventDto,
  ) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, orderId, deletedAt: null, order: { organizationId, ...notDeleted } },
    });
    if (!shipment)
      throw new NotFoundException(`Shipment ${shipmentId} not found in order ${orderId}`);
    if (dto.externalEventId) {
      const existing = await this.prisma.shipmentEvent.findUnique({
        where: { shipmentId_externalEventId: { shipmentId, externalEventId: dto.externalEventId } },
      });
      if (existing) return existing;
    }
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    const status = dto.status.trim().toUpperCase();
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.shipmentEvent.create({
        data: {
          shipmentId,
          status,
          description: dto.description,
          location: dto.location,
          occurredAt,
          source: dto.source?.trim().toUpperCase() || "MANUAL",
          externalCode: dto.externalCode,
          externalEventId: dto.externalEventId,
        },
      });
      if (status === "DELIVERED" && !shipment.deliveredAt) {
        await tx.shipment.update({
          where: { id: shipmentId },
          data: { deliveredAt: occurredAt, status: "DELIVERED" },
        });
      } else if (status === "POSTED" && !shipment.postedAt) {
        await tx.shipment.update({ where: { id: shipmentId }, data: { postedAt: occurredAt } });
      }
      return event;
    });
  }

  async updateStatus(organizationId: string, id: string, status: string) {
    const previous = await this.findOne(organizationId, id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({ where: { id }, data: { status: status as never } });
      if (previous.status !== status) {
        await tx.automationDomainEvent.create({
          data: {
            organizationId,
            eventType: "order.status.changed",
            aggregateType: "order",
            aggregateId: id,
            origin: "USER",
            payload: { orderId: id, from: previous.status, to: status },
            subjectType: "order",
            subjectId: id,
          },
        });
      }
      return updated;
    });
  }
  private async ensureDefaultStages(organizationId: string) {
    const hasStages = await this.prisma.orderStageDefinition.count({
      where: { organizationId, deletedAt: null },
    });
    const defaults = [
      ["new", "Novo pedido", "OPEN", "#64748B", true, false],
      ["review", "Conferência", "OPEN", "#F59E0B", false, false],
      ["production", "Em produção", "IN_PROGRESS", "#3B82F6", false, false],
      ["quality", "Controle de qualidade", "IN_PROGRESS", "#8B5CF6", false, false],
      ["ready", "Pronto para envio", "IN_PROGRESS", "#06B6D4", false, false],
      ["international", "China → Brasil", "IN_PROGRESS", "#0EA5E9", false, false],
      ["brazil", "Recebido no Brasil", "IN_PROGRESS", "#14B8A6", false, false],
      ["customer", "Enviado ao cliente", "IN_PROGRESS", "#22C55E", false, false],
      ["delivered", "Entregue", "DONE", "#16A34A", false, true],
      ["issue", "Problema / Pendência", "ISSUE", "#EF4444", false, false],
    ] as const;
    const defaultTranslations: Record<string, Record<string, string>> = {
      new: { "pt-BR": "Novo pedido", en: "New order", "zh-CN": "新订单", "zh-HK": "新訂單" },
      review: {
        "pt-BR": "Conferência",
        en: "Order review",
        "zh-CN": "订单核对",
        "zh-HK": "訂單核對",
      },
      production: {
        "pt-BR": "Em produção",
        en: "In production",
        "zh-CN": "生产中",
        "zh-HK": "生產中",
      },
      quality: {
        "pt-BR": "Controle de qualidade",
        en: "Quality control",
        "zh-CN": "质量检查",
        "zh-HK": "品質檢查",
      },
      ready: {
        "pt-BR": "Pronto para envio",
        en: "Ready to ship",
        "zh-CN": "准备发货",
        "zh-HK": "準備發貨",
      },
      international: {
        "pt-BR": "China → Brasil",
        en: "China → Brazil",
        "zh-CN": "中国 → 巴西",
        "zh-HK": "中國 → 巴西",
      },
      brazil: {
        "pt-BR": "Recebido no Brasil",
        en: "Received in Brazil",
        "zh-CN": "已抵达巴西",
        "zh-HK": "已抵達巴西",
      },
      customer: {
        "pt-BR": "Enviado ao cliente",
        en: "Shipped to customer",
        "zh-CN": "已发货给客户",
        "zh-HK": "已發貨給客戶",
      },
      delivered: { "pt-BR": "Entregue", en: "Delivered", "zh-CN": "已送达", "zh-HK": "已送達" },
      issue: {
        "pt-BR": "Problema / Pendência",
        en: "Issue / blocker",
        "zh-CN": "问题 / 阻塞",
        "zh-HK": "問題 / 阻塞",
      },
    };
    if (!hasStages)
      await this.prisma.orderStageDefinition.createMany({
        data: defaults.map(([code, name, category, color, isInitial, isFinal], position) => ({
          organizationId,
          code,
          name,
          category,
          color,
          isInitial,
          isFinal,
          position,
          translations: defaultTranslations[code],
        })),
      });
    const standardStages = await this.prisma.orderStageDefinition.findMany({
      where: { organizationId, code: { in: Object.keys(defaultTranslations) }, deletedAt: null },
      select: { id: true, code: true, translations: true },
    });
    for (const stage of standardStages) {
      const expected = defaultTranslations[stage.code];
      const current = (stage.translations ?? {}) as Record<string, string>;
      if (Object.entries(expected).some(([locale, value]) => current[locale] !== value)) {
        await this.prisma.orderStageDefinition.update({
          where: { id: stage.id },
          data: { translations: { ...current, ...expected } },
        });
      }
    }
    const initial = await this.prisma.orderStageDefinition.findFirst({
      where: { organizationId, isInitial: true, active: true, archived: false, deletedAt: null },
      orderBy: { position: "asc" },
    });
    if (initial)
      await this.prisma.order.updateMany({
        where: { organizationId, operationalStageId: null, deletedAt: null },
        data: { operationalStageId: initial.id },
      });
  }

  async stages(organizationId: string, includeArchived = false) {
    await this.ensureDefaultStages(organizationId);
    return this.prisma.orderStageDefinition.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(includeArchived ? {} : { active: true, archived: false }),
      },
      orderBy: { position: "asc" },
      include: { _count: { select: { orders: true } } },
    });
  }
  async createStage(organizationId: string, dto: CreateOrderStageDto) {
    const max = await this.prisma.orderStageDefinition.aggregate({
      where: { organizationId, deletedAt: null },
      _max: { position: true },
    });
    const code =
      dto.code?.trim() ||
      dto.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    return this.prisma.$transaction(async (tx) => {
      if (dto.isInitial)
        await tx.orderStageDefinition.updateMany({
          where: { organizationId, isInitial: true, deletedAt: null },
          data: { isInitial: false },
        });
      return tx.orderStageDefinition.create({
        data: {
          organizationId,
          code,
          name: dto.name.trim(),
          color: dto.color,
          category: dto.category as OrderStageCategory,
          isInitial: dto.isInitial,
          isFinal: dto.isFinal,
          translations: dto.translations ?? {},
          position: (max._max.position ?? -1) + 1,
        },
      });
    });
  }
  async updateStage(organizationId: string, id: string, dto: UpdateOrderStageDto) {
    const found = await this.prisma.orderStageDefinition.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!found) throw new NotFoundException("Etapa operacional não encontrada");
    if (
      dto.archived &&
      (await this.prisma.order.count({
        where: { organizationId, operationalStageId: id, deletedAt: null },
      }))
    ) {
      throw new BadRequestException("Esta etapa possui pedidos. Mova-os antes de arquivar.");
    }
    if (dto.archived && found.isInitial)
      throw new BadRequestException("Defina outra etapa inicial antes de arquivar esta etapa.");
    return this.prisma.$transaction(async (tx) => {
      if (dto.isInitial)
        await tx.orderStageDefinition.updateMany({
          where: { organizationId, isInitial: true, deletedAt: null },
          data: { isInitial: false },
        });
      return tx.orderStageDefinition.update({
        where: { id },
        data: { ...dto, category: dto.category as OrderStageCategory | undefined },
      });
    });
  }
  async reorderStages(organizationId: string, ids: string[]) {
    const count = await this.prisma.orderStageDefinition.count({
      where: { organizationId, id: { in: ids }, deletedAt: null },
    });
    if (count !== ids.length || new Set(ids).size !== ids.length)
      throw new BadRequestException("Ordem de etapas inválida");
    await this.prisma.$transaction(
      ids.map((id, position) =>
        this.prisma.orderStageDefinition.updateMany({
          where: { id, organizationId, deletedAt: null },
          data: { position },
        }),
      ),
    );
    return this.stages(organizationId, true);
  }
}
