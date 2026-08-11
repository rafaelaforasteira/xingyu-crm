import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateOrderDto,
  UpdateOrderDto,
  QueryOrdersDto,
  CreatePaymentDto,
  CreateShipmentDto,
} from "./dto/order.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async validateRelations(
    organizationId: string,
    ids: { contactId?: string; companyId?: string; dealId?: string; ownerId?: string },
  ) {
    const [contact, company, deal, owner] = await Promise.all([
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
    ]);
    const invalid =
      (ids.contactId && !contact && "Contato") ||
      (ids.companyId && !company && "Empresa") ||
      (ids.dealId && !deal && "Negociação") ||
      (ids.ownerId && !owner && "Responsável");
    if (invalid) throw new BadRequestException(`${invalid} inválido`);
  }

  async findAll(organizationId: string, query: QueryOrdersDto) {
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
      ...(query.search
        ? {
            OR: [
              { number: { contains: query.search, mode: "insensitive" } },
              { observations: { contains: query.search, mode: "insensitive" } },
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
      },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async create(organizationId: string, dto: CreateOrderDto, userId: string) {
    const { items, total, customerSnapshot, addressSnapshot, trackingSnapshot, ...data } = dto;
    const number = data.number?.trim() || data.externalName?.trim() || `ORD-${Date.now()}`;
    await this.validateRelations(organizationId, {
      contactId: data.contactId,
      companyId: data.companyId,
      dealId: data.dealId,
      ownerId: data.ownerId ?? userId,
    });
    const existingOrders = data.contactId
      ? await this.prisma.order.count({
          where: { organizationId, contactId: data.contactId, ...notDeleted },
        })
      : 0;
    return this.prisma.order.create({
      data: {
        contactId: data.contactId,
        companyId: data.companyId,
        dealId: data.dealId,
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
    await this.findOne(organizationId, id);
    await this.validateRelations(organizationId, {
      contactId: dto.contactId,
      companyId: dto.companyId,
      dealId: dto.dealId,
      ownerId: dto.ownerId,
    });
    const {
      items: _items,
      total,
      customerSnapshot,
      addressSnapshot,
      trackingSnapshot,
      ...data
    } = dto;
    return this.prisma.order.update({
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
      } as Prisma.OrderUpdateInput,
      include: { items: { include: { product: true } }, payments: true, shipments: true },
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
}
