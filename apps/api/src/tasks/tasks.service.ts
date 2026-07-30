import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateTaskDto,
  UpdateTaskDto,
  QueryTasksDto,
  RescheduleTaskDto,
} from "./dto/task.dto";

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryTasksDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.overdue
        ? { dueAt: { lt: new Date() }, status: { not: "COMPLETED" } }
        : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: "insensitive" } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: { dueAt: "asc" },
        include: {
          assignee: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          deal: { select: { id: true, name: true } },
        },
      }),
      this.prisma.task.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        assignee: { select: { id: true, name: true } },
        contact: true,
        deal: true,
        company: true,
      },
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return task;
  }

  async today(organizationId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.prisma.task.findMany({
      where: {
        organizationId,
        ...notDeleted,
        dueAt: { gte: start, lt: end },
        status: { not: "COMPLETED" },
      },
      orderBy: { dueAt: "asc" },
      include: {
        assignee: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, name: true } },
      },
    });
  }

  async create(organizationId: string, dto: CreateTaskDto, userId: string) {
    return this.prisma.task.create({
      data: {
        ...dto,
        organizationId,
        status: (dto.status as never) ?? "PENDING",
        type: (dto.type as never) ?? "FOLLOW_UP",
        priority: dto.priority as never,
        assigneeId: dto.assigneeId ?? userId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      } as never,
    });
  }

  async update(organizationId: string, id: string, dto: UpdateTaskDto) {
    await this.findOne(organizationId, id);
    return this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        status: dto.status as never,
        type: dto.type as never,
        priority: dto.priority as never,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      } as never,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.task.update({ where: { id }, data: softDeleteData() });
  }

  async complete(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);
    const task = await this.prisma.task.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    await this.prisma.activity.create({
      data: {
        organizationId,
        type: "TASK_COMPLETED",
        title: `Task completed: ${task.title}`,
        taskId: id,
        contactId: task.contactId,
        dealId: task.dealId,
        actorId: userId,
      },
    });
    return task;
  }

  async reopen(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.task.update({
      where: { id },
      data: { status: "PENDING", completedAt: null },
    });
  }

  async reschedule(organizationId: string, id: string, dto: RescheduleTaskDto) {
    await this.findOne(organizationId, id);
    return this.prisma.task.update({
      where: { id },
      data: { dueAt: new Date(dto.dueAt), status: "PENDING" },
    });
  }
}
