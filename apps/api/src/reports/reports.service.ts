import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { notDeleted } from "../common/utils/soft-delete";
import { ReportQueryDto } from "./dto/report.dto";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private dateRange(query: ReportQueryDto) {
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (!from && !to) return undefined;
    return {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  async dashboard(organizationId: string, query: ReportQueryDto) {
    const createdAt = this.dateRange(query);
    const base = {
      organizationId,
      ...notDeleted,
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
    };

    const [
      contactsCount,
      openDeals,
      wonDeals,
      openTasks,
      openOrders,
      conversationsOpen,
      wonValue,
    ] = await Promise.all([
      this.prisma.contact.count({
        where: { ...base, archived: false, ...(createdAt ? { createdAt } : {}) },
      }),
      this.prisma.deal.count({ where: { ...base, status: "OPEN" } }),
      this.prisma.deal.count({
        where: { ...base, status: "WON", ...(createdAt ? { closedAt: createdAt } : {}) },
      }),
      this.prisma.task.count({
        where: { organizationId, ...notDeleted, status: { not: "COMPLETED" } },
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),
      this.prisma.conversation.count({
        where: { organizationId, ...notDeleted, status: "OPEN" },
      }),
      this.prisma.deal.aggregate({
        where: { ...base, status: "WON", ...(createdAt ? { closedAt: createdAt } : {}) },
        _sum: { value: true },
      }),
    ]);

    return {
      contacts: contactsCount,
      openDeals,
      wonDeals,
      wonValue: wonValue._sum.value ?? 0,
      openTasks,
      openOrders,
      openConversations: conversationsOpen,
      generatedAt: new Date().toISOString(),
    };
  }

  async sales(organizationId: string, query: ReportQueryDto) {
    const closedAt = this.dateRange(query);
    const where = {
      organizationId,
      ...notDeleted,
      status: "WON",
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.pipelineId ? { pipelineId: query.pipelineId } : {}),
      ...(closedAt ? { closedAt } : {}),
    };

    const [deals, byOwner] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        take: 100,
        orderBy: { closedAt: "desc" },
        include: {
          owner: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true } },
        },
      }),
      this.prisma.deal.groupBy({
        by: ["ownerId"],
        where,
        _count: true,
        _sum: { value: true },
      }),
    ]);

    return { deals, byOwner };
  }

  async pipeline(organizationId: string, query: ReportQueryDto) {
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        organizationId,
        ...notDeleted,
        ...(query.pipelineId ? { id: query.pipelineId } : {}),
      },
      include: { stages: { orderBy: { position: "asc" } } },
    });

    const result = [];
    for (const pipeline of pipelines) {
      const stages = [];
      for (const stage of pipeline.stages) {
        const agg = await this.prisma.deal.aggregate({
          where: {
            organizationId,
            ...notDeleted,
            pipelineId: pipeline.id,
            stageId: stage.id,
            status: "OPEN",
          },
          _count: true,
          _sum: { value: true },
        });
        stages.push({
          stage,
          count: agg._count,
          totalValue: agg._sum.value ?? 0,
        });
      }
      result.push({ pipeline: { id: pipeline.id, name: pipeline.name }, stages });
    }
    return { data: result };
  }

  async tasks(organizationId: string, query: ReportQueryDto) {
    const where = {
      organizationId,
      ...notDeleted,
      ...(query.ownerId ? { assigneeId: query.ownerId } : {}),
    };
    const [byStatus, overdue] = await Promise.all([
      this.prisma.task.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      this.prisma.task.count({
        where: {
          ...where,
          status: { not: "COMPLETED" },
          dueAt: { lt: new Date() },
        },
      }),
    ]);
    return { byStatus, overdue };
  }
}
