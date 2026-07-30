import { Injectable, NotFoundException } from "@nestjs/common";
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
        orderBy: { [query.sortBy ?? "updatedAt"]: query.sortOrder ?? "desc" },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, legalName: true } },
          items: { include: { product: true } },
          payments: true,
          shipments: true,
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
      },
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async create(organizationId: string, dto: CreateOrderDto, userId: string) {
    const { items, total, ...data } = dto as CreateOrderDto & { total?: number };
    const number = `ORD-${Date.now()}`;
    return this.prisma.order.create({
      data: {
        contactId: data.contactId,
        companyId: data.companyId,
        dealId: data.dealId,
        observations: data.notes,
        organizationId,
        number,
        status: (data.status as never) ?? "ORDER_PLACED",
        ownerId: data.ownerId ?? userId,
        finalValue: total ?? 0,
        grossValue: total ?? 0,
        ...(items?.length
          ? {
              items: {
                create: items.map((item) => ({
                  productId: item.productId,
                  productName: (item as { productName?: string }).productName ?? "Item",
                  quantity: item.quantity,
                  unitPrice: item.unitPrice ?? 0,
                  totalPrice: (item.unitPrice ?? 0) * item.quantity,
                })),
              },
            }
          : {}),
      },
      include: { items: { include: { product: true } } },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateOrderDto) {
    await this.findOne(organizationId, id);
    const { items: _items, total, ...data } = dto as UpdateOrderDto & { total?: number };
    return this.prisma.order.update({
      where: { id },
      data: {
        ...data,
        ...(total !== undefined ? { finalValue: total } : {}),
        ...(data.notes !== undefined ? { observations: data.notes, notes: undefined } : {}),
        status: data.status as never,
      } as never,
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
