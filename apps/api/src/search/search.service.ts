import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { notDeleted } from "../common/utils/soft-delete";
import { GlobalSearchDto } from "./dto/search.dto";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async global(organizationId: string, query: GlobalSearchDto, allowedPipelineIds?: string[] | null) {
    const q = query.q.trim();
    const take = Math.min(Number(query.limit ?? 8), 20);
    const mode = "insensitive" as const;

    const [contacts, companies, deals, orders, products, tasks] = await Promise.all([
      this.prisma.contact.findMany({
        where: {
          organizationId,
          ...notDeleted,
          OR: [
            { firstName: { contains: q, mode } },
            { lastName: { contains: q, mode } },
            { email: { contains: q, mode } },
            { phone: { contains: q, mode } },
          ],
        },
        take,
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      }),
      this.prisma.company.findMany({
        where: {
          organizationId,
          ...notDeleted,
          OR: [
            { legalName: { contains: q, mode } },
            { tradeName: { contains: q, mode } },
            { cnpj: { contains: q, mode } },
          ],
        },
        take,
        select: { id: true, legalName: true, tradeName: true, cnpj: true },
      }),
      this.prisma.deal.findMany({
        where: {
          organizationId,
          ...notDeleted,
          ...(allowedPipelineIds ? { pipelineId: { in: allowedPipelineIds } } : {}),
          name: { contains: q, mode },
        },
        take,
        select: { id: true, name: true, value: true, status: true },
      }),
      this.prisma.order.findMany({
        where: {
          organizationId,
          ...notDeleted,
          ...(allowedPipelineIds ? { OR: [{ dealId: null }, { deal: { pipelineId: { in: allowedPipelineIds } } }] } : {}),
          number: { contains: q, mode },
        },
        take,
        select: { id: true, number: true, status: true, finalValue: true },
      }),
      this.prisma.product.findMany({
        where: {
          organizationId,
          ...notDeleted,
          OR: [
            { name: { contains: q, mode } },
            { sku: { contains: q, mode } },
          ],
        },
        take,
        select: { id: true, name: true, sku: true, price: true },
      }),
      this.prisma.task.findMany({
        where: {
          organizationId,
          ...notDeleted,
          ...(allowedPipelineIds ? { OR: [{ AND: [{ dealId: null }, { pipelineId: null }] }, { pipelineId: { in: allowedPipelineIds } }, { deal: { pipelineId: { in: allowedPipelineIds } } }] } : {}),
          title: { contains: q, mode },
        },
        take,
        select: { id: true, title: true, status: true, dueAt: true },
      }),
    ]);

    return { query: q, contacts, companies, deals, orders, products, tasks };
  }
}
