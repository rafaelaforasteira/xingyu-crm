import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma, TaskStatus, TaskStatusCategory } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateTaskDto,
  UpdateTaskDto,
  QueryTasksDto,
  RescheduleTaskDto,
  CreateTaskStatusDto,
  UpdateTaskStatusDto,
} from "./dto/task.dto";

const TASK_INCLUDE = {
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  contact: {
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  },
  deal: { select: { id: true, name: true, value: true, pipelineId: true, stageId: true } },
  pipeline: { select: { id: true, name: true, color: true } },
  stage: { select: { id: true, name: true, color: true } },
  statusDefinition: true,
} satisfies Prisma.TaskInclude;

function categoryToLegacyStatus(category: TaskStatusCategory): TaskStatus {
  if (category === "DONE") return "COMPLETED";
  if (category === "IN_PROGRESS") return "IN_PROGRESS";
  return "PENDING";
}

function legacyStatusToCategory(status: string): TaskStatusCategory {
  if (status === "COMPLETED" || status === "DONE" || status === "CANCELLED") {
    return "DONE";
  }
  if (status === "IN_PROGRESS") return "IN_PROGRESS";
  return "OPEN";
}

function mapTask(task: Prisma.TaskGetPayload<{ include: typeof TASK_INCLUDE }>) {
  const firstName = task.contact?.firstName ?? "";
  const lastName = task.contact?.lastName ?? "";
  const contactName = `${firstName} ${lastName}`.trim() || null;
  return {
    ...task,
    contact: task.contact
      ? {
          ...task.contact,
          name: contactName,
        }
      : null,
    status: task.status === "COMPLETED" ? "COMPLETED" : task.status,
  };
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaultStatuses(organizationId: string) {
    const count = await this.prisma.taskStatusDefinition.count({
      where: { organizationId, deletedAt: null },
    });
    if (count > 0) return;

    await this.prisma.taskStatusDefinition.createMany({
      data: [
        {
          id: `tsd-${organizationId}-pendente`,
          organizationId,
          name: "PENDENTE",
          slug: "pendente",
          color: "#F59E0B",
          position: 0,
          category: "OPEN",
        },
        {
          id: `tsd-${organizationId}-andamento`,
          organizationId,
          name: "EM ANDAMENTO",
          slug: "em-andamento",
          color: "#3B82F6",
          position: 1,
          category: "IN_PROGRESS",
        },
        {
          id: `tsd-${organizationId}-concluido`,
          organizationId,
          name: "CONCLUÍDO",
          slug: "concluido",
          color: "#22C55E",
          position: 2,
          category: "DONE",
        },
      ],
      skipDuplicates: true,
    });
  }

  async listStatuses(organizationId: string, includeArchived = false) {
    await this.ensureDefaultStatuses(organizationId);
    return this.prisma.taskStatusDefinition.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(includeArchived ? {} : { archived: false, active: true }),
      },
      orderBy: { position: "asc" },
    });
  }

  async createStatus(organizationId: string, dto: CreateTaskStatusDto) {
    await this.ensureDefaultStatuses(organizationId);
    const slug =
      dto.slug?.trim().toLowerCase().replace(/\s+/g, "-") ||
      dto.name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const max = await this.prisma.taskStatusDefinition.aggregate({
      where: { organizationId, deletedAt: null },
      _max: { position: true },
    });

    return this.prisma.taskStatusDefinition.create({
      data: {
        organizationId,
        name: dto.name.trim().toUpperCase(),
        slug,
        color: dto.color ?? "#64748B",
        category: (dto.category as TaskStatusCategory) ?? "OPEN",
        position: dto.position ?? (max._max.position ?? 0) + 1,
      },
    });
  }

  async updateStatus(organizationId: string, id: string, dto: UpdateTaskStatusDto) {
    const existing = await this.prisma.taskStatusDefinition.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Status ${id} not found`);

    return this.prisma.taskStatusDefinition.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim().toUpperCase() } : {}),
        ...(dto.slug ? { slug: dto.slug } : {}),
        ...(dto.color ? { color: dto.color } : {}),
        ...(dto.category ? { category: dto.category as TaskStatusCategory } : {}),
        ...(typeof dto.position === "number" ? { position: dto.position } : {}),
        ...(typeof dto.active === "boolean" ? { active: dto.active } : {}),
        ...(typeof dto.archived === "boolean" ? { archived: dto.archived } : {}),
      },
    });
  }

  async reorderStatuses(organizationId: string, statusIds: string[]) {
    await this.ensureDefaultStatuses(organizationId);
    await this.prisma.$transaction(
      statusIds.map((id, index) =>
        this.prisma.taskStatusDefinition.updateMany({
          where: { id, organizationId, deletedAt: null },
          data: { position: index },
        }),
      ),
    );
    return this.listStatuses(organizationId, true);
  }

  private async resolveStatusDefinitionId(
    organizationId: string,
    dto: { statusDefinitionId?: string; status?: string },
  ) {
    await this.ensureDefaultStatuses(organizationId);
    if (dto.statusDefinitionId) {
      const def = await this.prisma.taskStatusDefinition.findFirst({
        where: {
          id: dto.statusDefinitionId,
          organizationId,
          deletedAt: null,
        },
      });
      if (!def) throw new BadRequestException("Status inválido");
      return def;
    }

    const category = dto.status
      ? legacyStatusToCategory(dto.status)
      : ("OPEN" as TaskStatusCategory);

    const def = await this.prisma.taskStatusDefinition.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        archived: false,
        category,
      },
      orderBy: { position: "asc" },
    });
    if (!def) throw new BadRequestException("Nenhum status configurado");
    return def;
  }

  private async resolveDealLinks(organizationId: string, dealId?: string) {
    if (!dealId) return { pipelineId: undefined, stageId: undefined, contactId: undefined };
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
      select: { pipelineId: true, stageId: true, contactId: true },
    });
    if (!deal) throw new BadRequestException("Negociação inválida");
    return {
      pipelineId: deal.pipelineId,
      stageId: deal.stageId,
      contactId: deal.contactId ?? undefined,
    };
  }

  private async validateAssignee(organizationId: string, assigneeId?: string | null) {
    if (!assigneeId) return;
    const assignee = await this.prisma.user.findFirst({
      where: { id: assigneeId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!assignee) throw new BadRequestException("Responsável inválido");
  }

  async findAll(organizationId: string, query: QueryTasksDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = this.buildWhere(organizationId, query);
    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        include: TASK_INCLUDE,
      }),
      this.prisma.task.count({ where }),
    ]);
    return paginate(data.map(mapTask), total, page, pageSize);
  }

  async board(organizationId: string, query: QueryTasksDto) {
    await this.ensureDefaultStatuses(organizationId);
    const statuses = await this.listStatuses(organizationId);
    const where = this.buildWhere(organizationId, {
      ...query,
      status: undefined,
      statusDefinitionId: undefined,
    });

    const tasks = await this.prisma.task.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 500,
      include: TASK_INCLUDE,
    });

    const mapped = tasks.map(mapTask);
    return statuses.map((status) => {
      const groupTasks = mapped.filter(
        (task) =>
          task.statusDefinitionId === status.id ||
          (!task.statusDefinitionId &&
            legacyStatusToCategory(String(task.status)) === status.category),
      );
      return {
        status,
        tasks: groupTasks,
        count: groupTasks.length,
      };
    });
  }

  private buildWhere(organizationId: string, query: QueryTasksDto): Prisma.TaskWhereInput {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const endOfWeek = new Date(startOfDay);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    let statusFilter: Prisma.TaskWhereInput = {};
    if (query.statusDefinitionId) {
      statusFilter = { statusDefinitionId: query.statusDefinitionId };
    } else if (query.status) {
      const normalized = query.status === "DONE" ? "COMPLETED" : (query.status as TaskStatus);
      statusFilter = { status: normalized };
    }

    return {
      organizationId,
      ...notDeleted,
      ...statusFilter,
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.type ? { type: query.type as never } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.pipelineId ? { pipelineId: query.pipelineId } : {}),
      ...(query.stageId ? { stageId: query.stageId } : {}),
      ...(query.priority ? { priority: query.priority as never } : {}),
      ...(query.overdue ? { dueAt: { lt: now }, status: { not: "COMPLETED" } } : {}),
      ...(query.due === "today" ? { dueAt: { gte: startOfDay, lt: endOfDay } } : {}),
      ...(query.due === "week" ? { dueAt: { gte: startOfDay, lt: endOfWeek } } : {}),
      ...(query.search ? { title: { contains: query.search, mode: "insensitive" } } : {}),
    };
  }

  async findOne(organizationId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return mapTask(task);
  }

  async today(organizationId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const data = await this.prisma.task.findMany({
      where: {
        organizationId,
        ...notDeleted,
        dueAt: { gte: start, lt: end },
        status: { not: "COMPLETED" },
      },
      orderBy: { dueAt: "asc" },
      include: TASK_INCLUDE,
    });
    return data.map(mapTask);
  }

  async create(organizationId: string, dto: CreateTaskDto, userId: string) {
    await this.validateAssignee(organizationId, dto.assigneeId ?? userId);
    const statusDef = await this.resolveStatusDefinitionId(organizationId, dto);
    const dealLinks = await this.resolveDealLinks(organizationId, dto.dealId);
    const pipelineId = dto.pipelineId ?? dealLinks.pipelineId;
    const stageId = dto.stageId ?? dealLinks.stageId;
    const contactId = dto.contactId ?? dealLinks.contactId;

    const created = await this.prisma.task.create({
      data: {
        organizationId,
        title: dto.title,
        description: dto.description,
        type: (dto.type as never) ?? "FOLLOW_UP",
        status: categoryToLegacyStatus(statusDef.category),
        statusDefinitionId: statusDef.id,
        priority: (dto.priority as never) ?? "MEDIUM",
        assigneeId: dto.assigneeId ?? userId,
        contactId,
        companyId: dto.companyId,
        dealId: dto.dealId,
        pipelineId,
        stageId,
        orderId: dto.orderId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        createdById: userId,
      },
      include: TASK_INCLUDE,
    });

    await this.prisma.activity.create({
      data: {
        organizationId,
        type: "TASK_CREATED",
        title: `Tarefa criada: ${created.title}`,
        taskId: created.id,
        contactId: created.contactId,
        dealId: created.dealId,
        actorId: userId,
      },
    });

    return mapTask(created);
  }

  async update(organizationId: string, id: string, dto: UpdateTaskDto) {
    await this.findOne(organizationId, id);
    if (dto.assigneeId !== undefined) {
      await this.validateAssignee(organizationId, dto.assigneeId);
    }
    let statusDefId = dto.statusDefinitionId;
    let legacyStatus = dto.status === "DONE" ? "COMPLETED" : dto.status;

    if (dto.statusDefinitionId || dto.status) {
      const def = await this.resolveStatusDefinitionId(organizationId, dto);
      statusDefId = def.id;
      legacyStatus = categoryToLegacyStatus(def.category);
    }

    const dealLinks = dto.dealId ? await this.resolveDealLinks(organizationId, dto.dealId) : null;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.type ? { type: dto.type as never } : {}),
        ...(legacyStatus ? { status: legacyStatus as TaskStatus } : {}),
        ...(statusDefId ? { statusDefinitionId: statusDefId } : {}),
        ...(dto.priority ? { priority: dto.priority as never } : {}),
        ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
        ...(dto.contactId !== undefined
          ? { contactId: dto.contactId }
          : dealLinks?.contactId
            ? { contactId: dealLinks.contactId }
            : {}),
        ...(dto.dealId !== undefined ? { dealId: dto.dealId } : {}),
        ...(dto.pipelineId !== undefined
          ? { pipelineId: dto.pipelineId }
          : dealLinks
            ? { pipelineId: dealLinks.pipelineId }
            : {}),
        ...(dto.stageId !== undefined
          ? { stageId: dto.stageId }
          : dealLinks
            ? { stageId: dealLinks.stageId }
            : {}),
        ...(dto.dueAt !== undefined ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
        ...(legacyStatus === "COMPLETED"
          ? { completedAt: new Date() }
          : legacyStatus
            ? { completedAt: null }
            : {}),
      },
      include: TASK_INCLUDE,
    });
    return mapTask(updated);
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.task.update({ where: { id }, data: softDeleteData() });
  }

  async complete(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);
    await this.ensureDefaultStatuses(organizationId);
    const done = await this.prisma.taskStatusDefinition.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        category: "DONE",
        archived: false,
      },
      orderBy: { position: "asc" },
    });
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        status: "COMPLETED",
        statusDefinitionId: done?.id,
        completedAt: new Date(),
      },
      include: TASK_INCLUDE,
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
    return mapTask(task);
  }

  async reopen(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    await this.ensureDefaultStatuses(organizationId);
    const open = await this.prisma.taskStatusDefinition.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        category: "OPEN",
        archived: false,
      },
      orderBy: { position: "asc" },
    });
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        status: "PENDING",
        statusDefinitionId: open?.id,
        completedAt: null,
      },
      include: TASK_INCLUDE,
    });
    return mapTask(task);
  }

  async reschedule(organizationId: string, id: string, dto: RescheduleTaskDto) {
    await this.findOne(organizationId, id);
    const task = await this.prisma.task.update({
      where: { id },
      data: { dueAt: new Date(dto.dueAt) },
      include: TASK_INCLUDE,
    });
    return mapTask(task);
  }
}
