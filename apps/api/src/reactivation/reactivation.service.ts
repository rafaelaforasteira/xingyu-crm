import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted } from "../common/utils/soft-delete";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

@Injectable()
export class ReactivationService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: PaginationQueryDto, segment?: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);

    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      OR: [
        { status: "INACTIVE" },
        { orderCount: 0 },
        { daysWithoutPurchase: { gt: 120 } },
      ],
      ...(query.search
        ? {
            AND: [
              {
                OR: [
                  { firstName: { contains: query.search, mode: "insensitive" } },
                  { lastName: { contains: query.search, mode: "insensitive" } },
                  { email: { contains: query.search, mode: "insensitive" } },
                ],
              },
            ],
          }
        : {}),
    };

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take,
        include: {
          owner: { select: { id: true, name: true } },
          company: { select: { id: true, legalName: true } },
        },
        orderBy: { lastPurchaseAt: "asc" },
      }),
      this.prisma.contact.count({ where }),
    ]);

    const data = contacts
      .map((c) => {
        let classification = "cliente_sem_resposta";
        if (c.orderCount === 0) classification = "lead_nunca_comprou";
        else if (c.orderCount === 1) classification = "comprou_uma_vez";
        else if ((c.daysWithoutPurchase ?? 0) > 180) classification = "recorrente_parou";
        if (segment && classification !== segment) return null;
        return {
          ...c,
          opportunityType: "REACTIVATION",
          classification,
          inactiveDays: c.daysWithoutPurchase,
          pipelineStageHint: "Cliente inativo",
        };
      })
      .filter(Boolean);

    return paginate(data, segment ? data.length : total, page, pageSize);
  }
}
