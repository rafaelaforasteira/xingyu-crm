import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  QueryPipelinesDto,
  CreateStageDto,
  UpdateStageDto,
} from "./dto/pipeline.dto";

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryPipelinesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = {
      organizationId,
      ...notDeleted,
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.pipeline.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        include: { stages: { orderBy: { position: "asc" } } },
      }),
      this.prisma.pipeline.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: { stages: { orderBy: { position: "asc" } } },
    });
    if (!pipeline) throw new NotFoundException(`Pipeline ${id} not found`);
    return pipeline;
  }

  async create(organizationId: string, dto: CreatePipelineDto) {
    const { stages, ...data } = dto;
    return this.prisma.pipeline.create({
      data: {
        ...data,
        organizationId,
        ...(stages?.length
          ? {
              stages: {
                create: stages.map((s, i) => ({
                  ...s,
                  position: s.position ?? i,
                })),
              },
            }
          : {}),
      },
      include: { stages: { orderBy: { position: "asc" } } },
    });
  }

  async update(organizationId: string, id: string, dto: UpdatePipelineDto) {
    await this.findOne(organizationId, id);
    const { stages: _stages, ...data } = dto;
    return this.prisma.pipeline.update({
      where: { id },
      data,
      include: { stages: { orderBy: { position: "asc" } } },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.pipeline.update({ where: { id }, data: softDeleteData() });
  }

  async addStage(organizationId: string, pipelineId: string, dto: CreateStageDto) {
    await this.findOne(organizationId, pipelineId);
    const count = await this.prisma.pipelineStage.count({ where: { pipelineId } });
    return this.prisma.pipelineStage.create({
      data: {
        ...dto,
        pipelineId,
        position: dto.position ?? count,
      },
    });
  }

  async updateStage(
    organizationId: string,
    pipelineId: string,
    stageId: string,
    dto: UpdateStageDto,
  ) {
    await this.findOne(organizationId, pipelineId);
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId },
    });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    return this.prisma.pipelineStage.update({ where: { id: stageId }, data: dto });
  }

  async removeStage(organizationId: string, pipelineId: string, stageId: string) {
    await this.findOne(organizationId, pipelineId);
    const stage = await this.prisma.pipelineStage.findFirst({
      where: { id: stageId, pipelineId },
    });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    return this.prisma.pipelineStage.delete({ where: { id: stageId } });
  }
}
