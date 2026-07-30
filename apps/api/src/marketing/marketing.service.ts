import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  QueryCampaignsDto,
  AttributionQueryDto,
} from "./dto/marketing.dto";

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryCampaignsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.status ? { status: query.status } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.campaign.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const item = await this.prisma.campaign.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!item) throw new NotFoundException(`Campaign ${id} not found`);
    return item;
  }

  async create(organizationId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        ...dto,
        organizationId,
        status: dto.status ?? "DRAFT",
        channel: dto.channel ?? "meta_ads",
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        utmParams: dto.utmParams ?? {},
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateCampaignDto) {
    await this.findOne(organizationId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.campaign.update({ where: { id }, data: softDeleteData() });
  }

  async attribution(organizationId: string, query: AttributionQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);

    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.source ? { source: query.source } : {}),
      source: { not: null },
    };

    const [deals, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          value: true,
          status: true,
          source: true,
          campaignId: true,
          createdAt: true,
          contact: { select: { id: true, name: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);

    const bySource = await this.prisma.deal.groupBy({
      by: ["source"],
      where: { organizationId, ...notDeleted, source: { not: null } },
      _count: true,
      _sum: { value: true },
    });

    return {
      ...paginate(deals, total, page, pageSize),
      summary: bySource.map((row) => ({
        source: row.source,
        count: row._count,
        totalValue: row._sum.value ?? 0,
      })),
    };
  }
}
