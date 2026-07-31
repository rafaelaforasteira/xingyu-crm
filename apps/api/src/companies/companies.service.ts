import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import { CreateCompanyDto, UpdateCompanyDto, QueryCompaniesDto } from "./dto/company.dto";
import { toCompanyResponse, toContactResponse, toDealResponse } from "../common/mappers";

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
      ...(query.segment ? { segment: query.segment } : {}),
      ...(query.search
        ? {
            OR: [
              { legalName: { contains: query.search, mode: "insensitive" } },
              { tradeName: { contains: query.search, mode: "insensitive" } },
              { cnpj: { contains: query.search, mode: "insensitive" } },
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
    return paginate(data.map(toCompanyResponse), total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        owner: { select: { id: true, name: true } },
        contacts: { where: notDeleted, take: 50 },
        deals: {
          where: notDeleted,
          take: 20,
          orderBy: { updatedAt: "desc" },
          include: {
            tags: { include: { tag: true } },
            contact: true,
            company: true,
            stage: true,
          },
        },
      },
    });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return {
      ...toCompanyResponse(company),
      contacts: company.contacts.map(toContactResponse),
      deals: company.deals.map(toDealResponse),
    };
  }

  async create(organizationId: string, dto: CreateCompanyDto, userId: string) {
    const { notes, ...rest } = dto as CreateCompanyDto & { notes?: string };
    const created = await this.prisma.company.create({
      data: {
        ...rest,
        observations: notes,
        organizationId,
        ownerId: dto.ownerId ?? userId,
      } as never,
      include: { owner: { select: { id: true, name: true } } },
    });
    return toCompanyResponse(created);
  }

  async update(organizationId: string, id: string, dto: UpdateCompanyDto) {
    await this.requireCompany(organizationId, id);
    const { notes, ...rest } = dto as UpdateCompanyDto & { notes?: string };
    const updated = await this.prisma.company.update({
      where: { id },
      data: { ...rest, ...(notes !== undefined ? { observations: notes } : {}) } as never,
      include: { owner: { select: { id: true, name: true } } },
    });
    return toCompanyResponse(updated);
  }

  async remove(organizationId: string, id: string) {
    await this.requireCompany(organizationId, id);
    return this.prisma.company.update({ where: { id }, data: softDeleteData() });
  }

  private async requireCompany(organizationId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, organizationId, ...notDeleted },
      select: { id: true },
    });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }
}
