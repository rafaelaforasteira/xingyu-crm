import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma, TaskStatus, TaskStatusCategory } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/types";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateTaskDto,
  UpdateTaskDto,
  QueryTasksDto,
  RescheduleTaskDto,
  CreateTaskStatusDto,
  UpdateTaskStatusDto,
  CreateTaskCommentDto,
} from "./dto/task.dto";
import { validateAndSaveUpload } from "../common/upload/upload.util";

const TASK_INCLUDE = {
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  contact: {
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  },
  deal: {
    select: {
      id: true,
      name: true,
      value: true,
      leadSequence: true,
      ownerId: true,
      pipelineId: true,
      stageId: true,
    },
  },
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

  async pipelineIdForDeal(organizationId: string, dealId: string) {
    return (
      (
        await this.prisma.deal.findFirst({
          where: { id: dealId, organizationId, deletedAt: null },
          select: { pipelineId: true },
        })
      )?.pipelineId ?? null
    );
  }

  async pipelineIdForTask(organizationId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId, deletedAt: null },
      select: { pipelineId: true, deal: { select: { pipelineId: true } } },
    });
    return task?.deal?.pipelineId ?? task?.pipelineId ?? null;
  }

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

  async findAll(
    organizationId: string,
    query: QueryTasksDto,
    user: AuthenticatedUser,
    allowedPipelineIds?: string[] | null,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = this.withUserScope(
      this.withPipelineScope(this.buildWhere(organizationId, query), allowedPipelineIds),
      query.scope ?? "mine",
      user,
    );
    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        orderBy:
          query.state === "completed"
            ? [{ completedAt: "desc" }, { updatedAt: "desc" }]
            : [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        include: TASK_INCLUDE,
      }),
      this.prisma.task.count({ where }),
    ]);
    return paginate(data.map(mapTask), total, page, pageSize);
  }

  async board(organizationId: string, query: QueryTasksDto, user: AuthenticatedUser, allowedPipelineIds?: string[] | null) {
    await this.ensureDefaultStatuses(organizationId);
    const statuses = await this.listStatuses(organizationId);
    const where = this.withUserScope(this.withPipelineScope(
      this.buildWhere(organizationId, {
        ...query,
        status: undefined,
        statusDefinitionId: undefined,
      }),
      allowedPipelineIds,
    ), query.scope ?? "mine", user);

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
    const startOfDay = new Date();
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

    const finalState: Prisma.TaskWhereInput =
      query.state === "completed"
        ? {
            OR: [
              { statusDefinition: { category: "DONE" } },
              { statusDefinitionId: null, status: "COMPLETED" },
            ],
          }
        : query.state === "open"
          ? {
              NOT: {
                OR: [
                  { statusDefinition: { category: "DONE" } },
                  { statusDefinitionId: null, status: "COMPLETED" },
                ],
              },
            }
          : {};
    const dueState: Prisma.TaskWhereInput = query.due
      ? {
          AND: [
            {
              NOT: {
                OR: [
                  { statusDefinition: { category: "DONE" } },
                  { statusDefinitionId: null, status: "COMPLETED" },
                ],
              },
            },
            query.due === "overdue"
              ? { dueAt: { lt: startOfDay } }
              : query.due === "today"
                ? { dueAt: { gte: startOfDay, lt: endOfDay } }
                : query.due === "upcoming"
                  ? { dueAt: { gte: endOfDay } }
                  : query.due === "no-date"
                    ? { dueAt: null }
                    : query.due === "week"
                      ? { dueAt: { gte: startOfDay, lt: endOfWeek } }
                      : {},
          ],
        }
      : {};

    return {
      organizationId,
      ...notDeleted,
      AND: [statusFilter, finalState, dueState],
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.type ? { type: query.type as never } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.pipelineId ? { pipelineId: query.pipelineId } : {}),
      ...(query.stageId ? { stageId: query.stageId } : {}),
      ...(query.priority ? { priority: query.priority as never } : {}),
      ...(query.overdue ? { dueAt: { lt: startOfDay } } : {}),
      ...(query.search ? { title: { contains: query.search, mode: "insensitive" } } : {}),
    };
  }

  private withUserScope(
    where: Prisma.TaskWhereInput,
    scope: "mine" | "team" | "all",
    user: AuthenticatedUser,
  ): Prisma.TaskWhereInput {
    if (scope === "mine") return { AND: [where, { assigneeId: user.id }] };
    if (scope === "team" && user.teamId && (user.role === "ADMIN" || user.role === "MANAGER")) {
      return {
        AND: [where, { assignee: { teamId: user.teamId, status: "ACTIVE", deletedAt: null } }],
      };
    }
    if (user.role === "ADMIN") return where;
    return { AND: [where, { OR: [{ assigneeId: user.id }, { deal: { ownerId: user.id } }] }] };
  }

  private withPipelineScope(
    where: Prisma.TaskWhereInput,
    allowed?: string[] | null,
  ): Prisma.TaskWhereInput {
    return allowed
      ? {
          AND: [
            where,
            {
              OR: [
                { deal: { pipelineId: { in: allowed } } },
                { pipelineId: { in: allowed } },
                { AND: [{ dealId: null }, { pipelineId: null }] },
              ],
            },
          ],
        }
      : where;
  }

  async findOne(organizationId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    return mapTask(task);
  }

  async workspace(organizationId: string, id: string) {
    const task = await this.findOne(organizationId, id);
    const [comments, activity] = await Promise.all([
      this.prisma.taskComment.findMany({
        where: { organizationId, taskId: id, deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          mentions: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          attachments: true,
        },
      }),
      this.prisma.activity.findMany({
        where: { organizationId, taskId: id },
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
      }),
    ]);
    return { task, comments, activity };
  }

  async createComment(organizationId: string, taskId: string, authorId: string, dto: CreateTaskCommentDto, files: Express.Multer.File[]) {
    await this.findOne(organizationId, taskId);
    const body = dto.body?.trim() ?? "";
    if (!body && files.length === 0) throw new BadRequestException("Escreva um comentário ou anexe um arquivo.");
    let mentionIds: string[] = [];
    if (dto.mentionIds) {
      try { mentionIds = JSON.parse(dto.mentionIds); } catch { throw new BadRequestException("Menções inválidas."); }
    }
    mentionIds = [...new Set(mentionIds)].filter((id) => id !== authorId);
    const validUsers = mentionIds.length ? await this.prisma.user.findMany({
      where: { id: { in: mentionIds }, organizationId, status: "ACTIVE", deletedAt: null }, select: { id: true },
    }) : [];
    if (validUsers.length !== mentionIds.length) throw new BadRequestException("Usuário mencionado inválido.");
    const uploads = files.map(validateAndSaveUpload);
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.taskComment.create({
        data: {
          organizationId, taskId, authorId, body,
          mentions: { create: mentionIds.map((userId) => ({ organizationId, userId })) },
          attachments: { create: uploads.map((file) => ({ organizationId, fileName: file.originalName, mimeType: file.mimeType, fileSize: file.fileSize, url: file.url, kind: file.kind })) },
        },
        include: { author: { select: { id: true, name: true, avatarUrl: true } }, mentions: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } }, attachments: true },
      });
      if (mentionIds.length) await tx.notification.createMany({ data: mentionIds.map((userId) => ({ organizationId, userId, type: "TASK_MENTION", title: "Você foi mencionado em uma tarefa", body: body.slice(0, 180) || "Novo anexo", href: `/tasks?task=${taskId}`, entityType: "TASK", entityId: taskId })) });
      await tx.activity.create({ data: { organizationId, type: "OTHER", title: "Comentário adicionado", taskId, actorId: authorId, metadata: { commentId: comment.id, attachments: uploads.length, mentions: mentionIds.length } } });
      return comment;
    });
  }

  async today(organizationId: string, allowedPipelineIds?: string[] | null) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const data = await this.prisma.task.findMany({
      where: this.withPipelineScope(
        {
          organizationId,
          ...notDeleted,
          dueAt: { gte: start, lt: end },
          status: { not: "COMPLETED" },
        },
        allowedPipelineIds,
      ),
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
    if (dto.sourceNoteId) {
      const sourceNote = await this.prisma.note.findFirst({
        where: { id: dto.sourceNoteId, organizationId, deletedAt: null },
        select: { dealId: true },
      });
      if (!sourceNote || sourceNote.dealId !== dto.dealId) {
        throw new BadRequestException("Nota de origem inválida para esta negociação");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
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
          sourceNoteId: dto.sourceNoteId,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
          createdById: userId,
        },
        include: TASK_INCLUDE,
      });

      if (created.dealId)
        await tx.activity.create({
          data: {
            organizationId,
            type: "TASK_CREATED",
            title: "Task created",
            taskId: created.id,
            contactId: created.contactId,
            dealId: created.dealId,
            actorId: userId,
          },
        });
      await tx.automationDomainEvent.create({
        data: {
          organizationId,
          eventType: "task.created",
          aggregateType: "task",
          aggregateId: created.id,
          origin: "USER",
          actorId: userId,
          payload: { taskId: created.id, dealId: created.dealId, assigneeId: created.assigneeId },
          subjectType: "task",
          subjectId: created.id,
        },
      });

      return mapTask(created);
    });
  }

  async update(organizationId: string, id: string, dto: UpdateTaskDto, userId: string) {
    const previous = await this.findOne(organizationId, id);
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

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
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
      const wasDone = previous.status === "COMPLETED";
      const isDone = updated.status === "COMPLETED";
      if (updated.dealId && wasDone !== isDone) {
        await tx.activity.create({
          data: {
            organizationId,
            type: isDone ? "TASK_COMPLETED" : "TASK_REOPENED",
            title: isDone ? "Task completed" : "Task reopened",
            taskId: id,
            contactId: updated.contactId,
            dealId: updated.dealId,
            actorId: userId,
          },
        });
      }
      return mapTask(updated);
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.task.update({ where: { id }, data: softDeleteData() });
  }

  async complete(organizationId: string, id: string, userId: string) {
    const current = await this.findOne(organizationId, id);
    if (current.status === "COMPLETED") return current;
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
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data: {
          status: "COMPLETED",
          statusDefinitionId: done?.id,
          completedAt: new Date(),
        },
        include: TASK_INCLUDE,
      });
      if (task.dealId)
        await tx.activity.create({
          data: {
            organizationId,
            type: "TASK_COMPLETED",
            title: "Task completed",
            taskId: id,
            contactId: task.contactId,
            dealId: task.dealId,
            actorId: userId,
          },
        });
      await tx.automationDomainEvent.create({
        data: {
          organizationId,
          eventType: "task.completed",
          aggregateType: "task",
          aggregateId: task.id,
          origin: "USER",
          actorId: userId,
          payload: { taskId: task.id, dealId: task.dealId, assigneeId: task.assigneeId },
          subjectType: "task",
          subjectId: task.id,
        },
      });
      return mapTask(task);
    });
  }

  async reopen(organizationId: string, id: string, userId: string) {
    const current = await this.findOne(organizationId, id);
    if (current.status !== "COMPLETED") return current;
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
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data: {
          status: "PENDING",
          statusDefinitionId: open?.id,
          completedAt: null,
        },
        include: TASK_INCLUDE,
      });
      if (task.dealId)
        await tx.activity.create({
          data: {
            organizationId,
            type: "TASK_REOPENED",
            title: "Task reopened",
            taskId: id,
            contactId: task.contactId,
            dealId: task.dealId,
            actorId: userId,
          },
        });
      return mapTask(task);
    });
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
