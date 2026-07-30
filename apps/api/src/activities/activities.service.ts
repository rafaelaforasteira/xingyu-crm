import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { CreateActivityDto, QueryActivitiesDto } from "./dto/activity.dto";

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryActivitiesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
      ...(query.type ? { type: query.type } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, name: true } },
        },
      }),
      this.prisma.activity.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async timeline(organizationId: string, query: QueryActivitiesDto) {
    return this.findAll(organizationId, { ...query, pageSize: query.pageSize ?? 50 });
  }

  async findOne(organizationId: string, id: string) {
    const item = await this.prisma.activity.findFirst({
      where: { id, organizationId },
      include: { actor: { select: { id: true, name: true } } },
    });
    if (!item) throw new NotFoundException(`Activity ${id} not found`);
    return item;
  }

  async create(organizationId: string, dto: CreateActivityDto, userId: string) {
    return this.prisma.activity.create({
      data: {
        ...dto,
        type: dto.type as never,
        organizationId,
        actorId: userId,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.activity.delete({ where: { id } });
  }
}
