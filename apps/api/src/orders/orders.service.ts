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
              { orderNumber: { contains: query.search, mode: "insensitive" } },
              { notes: { contains: query.search, mode: "insensitive" } },
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
          contact: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
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
    const { items, ...data } = dto;
    const orderNumber = `ORD-${Date.now()}`;
    return this.prisma.order.create({
      data: {
        ...data,
        organizationId,
        orderNumber,
        status: data.status ?? "ORDER_PLACED",
        currency: data.currency ?? "BRL",
        ownerId: data.ownerId ?? userId,
        ...(items?.length
          ? {
              items: {
                create: items.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice ?? 0,
                  notes: item.notes,
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
    const { items: _items, ...data } = dto;
    return this.prisma.order.update({
      where: { id },
      data,
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
        ...dto,
        orderId,
        organizationId,
        status: dto.status ?? "PENDING",
        method: dto.method ?? "PIX",
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      },
    });
  }

  async addShipment(organizationId: string, orderId: string, dto: CreateShipmentDto) {
    await this.findOne(organizationId, orderId);
    return this.prisma.shipment.create({
      data: {
        ...dto,
        orderId,
        organizationId,
        status: dto.status ?? "PENDING",
        shippedAt: dto.shippedAt ? new Date(dto.shippedAt) : undefined,
        estimatedArrival: dto.estimatedArrival ? new Date(dto.estimatedArrival) : undefined,
      },
    });
  }

  async updateStatus(organizationId: string, id: string, status: string) {
    await this.findOne(organizationId, id);
    return this.prisma.order.update({ where: { id }, data: { status } });
  }
}
