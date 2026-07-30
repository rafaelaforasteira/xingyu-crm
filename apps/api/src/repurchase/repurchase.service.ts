import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted } from "../common/utils/soft-delete";
import { QueryRepurchaseDto } from "./dto/repurchase.dto";

@Injectable()
export class RepurchaseService {
  constructor(private readonly prisma: PrismaService) {}

  async listRepurchaseOpportunities(organizationId: string, query: QueryRepurchaseDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const days = query.daysSincePurchase ?? 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      status: "WON",
      closedAt: { lte: since },
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip,
        take,
        orderBy: { closedAt: "asc" },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              whatsapp: true,
            },
          },
          company: { select: { id: true, legalName: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);

    return paginate(
      data.map((d) => ({
        ...d,
        opportunityType: "REPURCHASE",
        daysSinceClose: d.closedAt
          ? Math.floor((Date.now() - new Date(d.closedAt).getTime()) / 86400000)
          : null,
      })),
      total,
      page,
      pageSize,
    );
  }
}
