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
        name: dto.name,
        organizationId,
        status: dto.status ?? "DRAFT",
        channel: dto.channel ?? "meta_ads",
        budget: dto.budget,
        startsAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endsAt: dto.endAt ? new Date(dto.endAt) : undefined,
        metadata: {
          description: dto.description,
          utmParams: dto.utmParams ?? {},
        } as never,
      } as never,
    });
  }

  async update(organizationId: string, id: string, dto: UpdateCampaignDto) {
    await this.findOne(organizationId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
        channel: dto.channel,
        budget: dto.budget,
        startsAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endsAt: dto.endAt ? new Date(dto.endAt) : undefined,
        metadata: {
          description: dto.description,
          utmParams: dto.utmParams ?? {},
        } as never,
      } as never,
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
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.source ? { source: query.source } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.attribution.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true } },
          order: { select: { id: true, number: true, finalValue: true } },
          campaignRef: { select: { id: true, name: true } },
        },
      }),
      this.prisma.attribution.count({ where }),
    ]);

    const bySource = await this.prisma.attribution.groupBy({
      by: ["source"],
      where: { organizationId },
      _count: true,
    });

    return {
      ...paginate(rows, total, page, pageSize),
      summary: bySource.map((row) => ({
        source: row.source,
        count: row._count,
      })),
    };
  }
}
