import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateDealDto,
  UpdateDealDto,
  QueryDealsDto,
  MoveStageDto,
  WinLoseDto,
  BulkMoveDealsDto,
} from "./dto/deal.dto";

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryDealsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.pipelineId ? { pipelineId: query.pipelineId } : {}),
      ...(query.stageId ? { stageId: query.stageId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy ?? "updatedAt"]: query.sortOrder ?? "desc" },
        include: {
          contact: { select: { id: true, name: true } },
          company: { select: { id: true, name: true } },
          stage: true,
          owner: { select: { id: true, name: true } },
        },
      }),
      this.prisma.deal.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        contact: true,
        company: true,
        stage: true,
        pipeline: { include: { stages: { orderBy: { position: "asc" } } } },
        owner: { select: { id: true, name: true } },
        activities: { where: notDeleted, take: 20, orderBy: { createdAt: "desc" } },
      },
    });
    if (!deal) throw new NotFoundException(`Deal ${id} not found`);
    return deal;
  }

  async create(organizationId: string, dto: CreateDealDto, userId: string) {
    return this.prisma.deal.create({
      data: {
        ...dto,
        organizationId,
        ownerId: dto.ownerId ?? userId,
        status: dto.status ?? "OPEN",
        expectedCloseAt: dto.expectedCloseAt ? new Date(dto.expectedCloseAt) : undefined,
      },
      include: { stage: true, contact: true },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateDealDto) {
    await this.findOne(organizationId, id);
    return this.prisma.deal.update({
      where: { id },
      data: {
        ...dto,
        expectedCloseAt: dto.expectedCloseAt ? new Date(dto.expectedCloseAt) : undefined,
      },
      include: { stage: true, contact: true },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.deal.update({ where: { id }, data: softDeleteData() });
  }

  async moveStage(organizationId: string, id: string, dto: MoveStageDto, userId: string) {
    const deal = await this.findOne(organizationId, id);
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, pipelineId: deal.pipelineId },
    });
    if (!stage) throw new BadRequestException("Stage not in deal pipeline");

    const updated = await this.prisma.deal.update({
      where: { id },
      data: {
        stageId: dto.stageId,
        ...(stage.isWon ? { status: "WON", closedAt: new Date() } : {}),
        ...(stage.isLost ? { status: "LOST", closedAt: new Date() } : {}),
      },
      include: { stage: true },
    });

    await this.prisma.activity.create({
      data: {
        organizationId,
        type: "DEAL_STAGE_CHANGED",
        title: `Deal moved to ${stage.name}`,
        dealId: id,
        contactId: deal.contactId,
        userId,
      },
    });

    return updated;
  }

  async win(organizationId: string, id: string, dto: WinLoseDto, userId: string) {
    const deal = await this.findOne(organizationId, id);
    const wonStage = await this.prisma.pipelineStage.findFirst({
      where: { pipelineId: deal.pipelineId, isWon: true },
    });
    const updated = await this.prisma.deal.update({
      where: { id },
      data: {
        status: "WON",
        closedAt: new Date(),
        lostReason: null,
        ...(dto.value !== undefined ? { value: dto.value } : {}),
        ...(wonStage ? { stageId: wonStage.id } : {}),
      },
      include: { stage: true },
    });
    await this.prisma.activity.create({
      data: {
        organizationId,
        type: "DEAL_WON",
        title: `Deal won${dto.reason ? `: ${dto.reason}` : ""}`,
        dealId: id,
        contactId: deal.contactId,
        userId,
      },
    });
    return updated;
  }

  async lose(organizationId: string, id: string, dto: WinLoseDto, userId: string) {
    const deal = await this.findOne(organizationId, id);
    const lostStage = await this.prisma.pipelineStage.findFirst({
      where: { pipelineId: deal.pipelineId, isLost: true },
    });
    const updated = await this.prisma.deal.update({
      where: { id },
      data: {
        status: "LOST",
        closedAt: new Date(),
        lostReason: dto.reason,
        ...(lostStage ? { stageId: lostStage.id } : {}),
      },
      include: { stage: true },
    });
    await this.prisma.activity.create({
      data: {
        organizationId,
        type: "DEAL_LOST",
        title: `Deal lost${dto.reason ? `: ${dto.reason}` : ""}`,
        dealId: id,
        contactId: deal.contactId,
        userId,
      },
    });
    return updated;
  }

  async bulkMove(organizationId: string, dto: BulkMoveDealsDto) {
    await this.prisma.deal.updateMany({
      where: { id: { in: dto.dealIds }, organizationId, ...notDeleted },
      data: { stageId: dto.stageId },
    });
    return { updated: dto.dealIds.length };
  }

  async kanban(organizationId: string, pipelineId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId, ...notDeleted },
      include: { stages: { orderBy: { position: "asc" } } },
    });
    if (!pipeline) throw new NotFoundException(`Pipeline ${pipelineId} not found`);

    const deals = await this.prisma.deal.findMany({
      where: {
        organizationId,
        pipelineId,
        ...notDeleted,
        status: { in: ["OPEN", "WON", "LOST"] },
      },
      include: {
        contact: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const columns = pipeline.stages.map((stage) => {
      const stageDeals = deals.filter((d) => d.stageId === stage.id);
      return {
        stage,
        deals: stageDeals,
        count: stageDeals.length,
        totalValue: stageDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0),
      };
    });

    return { pipeline: { id: pipeline.id, name: pipeline.name }, columns };
  }
}
