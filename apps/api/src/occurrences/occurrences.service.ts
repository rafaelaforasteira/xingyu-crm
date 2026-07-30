import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateOccurrenceDto,
  UpdateOccurrenceDto,
  QueryOccurrencesDto,
} from "./dto/occurrence.dto";

@Injectable()
export class OccurrencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryOccurrencesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.assigneeId ? { ownerId: query.assigneeId } : {}),
      ...(query.search
        ? {
            OR: [
              { protocol: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.occurrence.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, number: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
      this.prisma.occurrence.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const item = await this.prisma.occurrence.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        contact: true,
        order: true,
        owner: { select: { id: true, name: true } },
      },
    });
    if (!item) throw new NotFoundException(`Occurrence ${id} not found`);
    return item;
  }

  async create(organizationId: string, dto: CreateOccurrenceDto, userId: string) {
    return this.prisma.occurrence.create({
      data: {
        organizationId,
        protocol: `OC-${Date.now()}`,
        type: (dto.type as never) ?? "GENERAL_COMPLAINT",
        status: (dto.status as never) ?? "OPEN",
        priority: (dto.priority as never) ?? "MEDIUM",
        description: dto.description ?? dto.title,
        orderId: dto.orderId,
        contactId: dto.contactId,
        ownerId: dto.assigneeId ?? userId,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateOccurrenceDto) {
    await this.findOne(organizationId, id);
    return this.prisma.occurrence.update({
      where: { id },
      data: {
        description: dto.description ?? dto.title,
        type: dto.type as never,
        status: dto.status as never,
        priority: dto.priority as never,
        orderId: dto.orderId,
        contactId: dto.contactId,
        ownerId: dto.assigneeId,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.occurrence.update({ where: { id }, data: softDeleteData() });
  }
}
