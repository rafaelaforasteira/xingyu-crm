import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import { CreateCompanyDto, UpdateCompanyDto, QueryCompaniesDto } from "./dto/company.dto";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryCompaniesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.industry ? { industry: query.industry } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { tradeName: { contains: query.search, mode: "insensitive" } },
              { document: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy ?? "updatedAt"]: query.sortOrder ?? "desc" },
        include: {
          owner: { select: { id: true, name: true } },
          _count: { select: { contacts: true } },
        },
      }),
      this.prisma.company.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        owner: { select: { id: true, name: true } },
        contacts: { where: notDeleted, take: 50 },
        deals: { where: notDeleted, take: 20, orderBy: { updatedAt: "desc" } },
      },
    });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  async create(organizationId: string, dto: CreateCompanyDto, userId: string) {
    return this.prisma.company.create({
      data: { ...dto, organizationId, ownerId: dto.ownerId ?? userId },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateCompanyDto) {
    await this.findOne(organizationId, id);
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.company.update({ where: { id }, data: softDeleteData() });
  }
}
