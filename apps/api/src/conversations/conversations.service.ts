import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import { toContactResponse } from "../common/mappers/contact.mapper";
import { toCompanyResponse } from "../common/mappers/company.mapper";
import {
  toChannelSummary,
  toConversationListItem,
  toCurrentDealSummary,
  mergeConversationTags,
} from "../common/mappers/conversation.mapper";
import { toPipelineResponse, toPipelineStageResponse } from "../common/mappers/pipeline.mapper";
import { validateAndSaveUpload } from "../common/upload/upload.util";
import {
  CreateConversationDto,
  UpdateConversationDto,
  QueryConversationsDto,
  QueryMessagesDto,
  SendMessageDto,
} from "./dto/conversation.dto";

const LIST_INCLUDE = {
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      tags: { include: { tag: true } },
    },
  },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  channel: {
    select: {
      id: true,
      type: true,
      name: true,
      displayName: true,
      provider: true,
      externalAccountId: true,
      status: true,
    },
  },
  deal: {
    where: notDeleted,
    select: {
      id: true,
      name: true,
      pipelineId: true,
      stageId: true,
      priority: true,
      stage: { select: { name: true } },
      tags: { include: { tag: true } },
    },
  },
} satisfies Prisma.ConversationInclude;

const DETAIL_INCLUDE = {
  contact: {
    include: {
      tags: { include: { tag: true } },
      company: true,
    },
  },
  assignee: { select: { id: true, name: true, avatarUrl: true } },
  channel: {
    select: {
      id: true,
      type: true,
      name: true,
      displayName: true,
      provider: true,
      externalAccountId: true,
      status: true,
    },
  },
  deal: {
    where: notDeleted,
    include: {
      stage: { select: { id: true, name: true, pipelineId: true, color: true, position: true } },
      pipeline: { select: { id: true, name: true, color: true } },
      owner: { select: { id: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
    },
  },
} satisfies Prisma.ConversationInclude;

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertConversationExists(organizationId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId, ...notDeleted },
      select: { id: true, contactId: true },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }
    return conversation;
  }

  private async latestMessagePreview(conversationId: string) {
    const latest = await this.prisma.message.findFirst({
      where: { conversationId, ...notDeleted },
      orderBy: { sentAt: "desc" },
      select: { body: true, sentAt: true },
    });
    return {
      lastMessagePreview: latest?.body ?? null,
      lastMessageAt: latest?.sentAt ?? null,
    };
  }

  private buildListWhere(
    organizationId: string,
    query: QueryConversationsDto,
  ): Prisma.ConversationWhereInput {
    const channelIds =
      query.channels?.length
        ? query.channels
        : query.channelId || query.integrationAccountId
          ? [query.channelId ?? query.integrationAccountId!]
          : [];
    const stageIds =
      query.stages?.length
        ? query.stages
        : query.stageId
          ? [query.stageId]
          : [];
    const tagIds =
      query.tags?.length ? query.tags : query.tagId ? [query.tagId] : [];

    const andFilters: Prisma.ConversationWhereInput[] = [];

    if (query.pipelineId) {
      andFilters.push({ deal: { pipelineId: query.pipelineId, ...notDeleted } });
    }
    if (stageIds.length) {
      andFilters.push({
        deal: { stageId: { in: stageIds }, ...notDeleted },
      });
    }
    if (query.teamId) {
      andFilters.push({
        OR: [
          { deal: { teamId: query.teamId, ...notDeleted } },
          { contact: { teamId: query.teamId, ...notDeleted } },
        ],
      });
    }
    if (tagIds.length) {
      andFilters.push({
        OR: [
          {
            contact: {
              tags: { some: { tagId: { in: tagIds } } },
              ...notDeleted,
            },
          },
          {
            deal: {
              tags: { some: { tagId: { in: tagIds } } },
              ...notDeleted,
            },
          },
        ],
      });
    }
    if (query.search) {
      const search = query.search;
      andFilters.push({
        OR: [
          { subject: { contains: search, mode: "insensitive" } },
          {
            contact: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
              ],
              ...notDeleted,
            },
          },
          { deal: { name: { contains: search, mode: "insensitive" }, ...notDeleted } },
        ],
      });
    }

    const periodFilter = this.buildPeriodFilter(query.period);
    if (periodFilter) andFilters.push(periodFilter);

    let statusFilter: Prisma.ConversationWhereInput["status"] | undefined;
    if (query.conversationState === "open") {
      statusFilter = { in: ["OPEN", "PENDING"] };
    } else if (query.conversationState === "closed") {
      statusFilter = { in: ["RESOLVED", "ARCHIVED"] };
    } else if (query.status) {
      statusFilter = query.status as never;
    }

    return {
      organizationId,
      ...notDeleted,
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.withoutAssignee ? { assigneeId: null } : {}),
      ...(query.unreadOnly ? { unreadCount: { gt: 0 } } : {}),
      ...(channelIds.length === 1
        ? { channelId: channelIds[0] }
        : channelIds.length > 1
          ? { channelId: { in: channelIds } }
          : {}),
      ...(andFilters.length ? { AND: andFilters } : {}),
    };
  }

  private buildPeriodFilter(
    period?: QueryConversationsDto["period"],
  ): Prisma.ConversationWhereInput | null {
    if (!period) return null;
    const now = new Date();
    if (period === "today") {
      const day = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
      return { lastMessageAt: { gte: new Date(`${day}T00:00:00-03:00`) } };
    }
    if (period === "7d") {
      return {
        lastMessageAt: {
          gte: new Date(now.getTime() - 7 * 86_400_000),
        },
      };
    }
    if (period === "30d") {
      return {
        lastMessageAt: {
          gte: new Date(now.getTime() - 30 * 86_400_000),
        },
      };
    }
    if (period === "older30") {
      return {
        lastMessageAt: {
          lt: new Date(now.getTime() - 30 * 86_400_000),
          not: null,
        },
      };
    }
    return null;
  }

  private async filterIdsByLastMessageDirection(
    organizationId: string,
    direction: "INBOUND" | "OUTBOUND",
  ): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM "Conversation" c
      INNER JOIN LATERAL (
        SELECT m.direction
        FROM "Message" m
        WHERE m."conversationId" = c.id
          AND m."deletedAt" IS NULL
          AND m."isInternal" = false
        ORDER BY m."sentAt" DESC
        LIMIT 1
      ) last_msg ON true
      WHERE c."organizationId" = ${organizationId}
        AND c."deletedAt" IS NULL
        AND c.status = 'OPEN'
        AND last_msg.direction::text = ${direction}
    `;
    return rows.map((row) => row.id);
  }

  private async loadLastMessageDirections(
    conversationIds: string[],
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!conversationIds.length) return map;
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: { in: conversationIds },
        isInternal: false,
        ...notDeleted,
      },
      orderBy: { sentAt: "desc" },
      distinct: ["conversationId"],
      select: { conversationId: true, direction: true },
    });
    for (const message of messages) {
      map.set(message.conversationId, message.direction);
    }
    return map;
  }

  private sortCandidatesByPriority<
    T extends {
      id: string;
      status: string;
      unreadCount: number;
      lastMessageAt: Date | null;
      updatedAt: Date;
    },
  >(
    candidates: T[],
    directions: Map<string, string>,
  ): T[] {
    return candidates.slice().sort((left, right) => {
      const leftGroup = this.priorityGroup(
        left.status,
        left.unreadCount,
        directions.get(left.id),
      );
      const rightGroup = this.priorityGroup(
        right.status,
        right.unreadCount,
        directions.get(right.id),
      );
      if (leftGroup !== rightGroup) return leftGroup - rightGroup;
      const leftTime = left.lastMessageAt?.getTime() ?? 0;
      const rightTime = right.lastMessageAt?.getTime() ?? 0;
      if (leftTime !== rightTime) return rightTime - leftTime;
      const leftUpdated = left.updatedAt.getTime();
      const rightUpdated = right.updatedAt.getTime();
      if (leftUpdated !== rightUpdated) return rightUpdated - leftUpdated;
      return left.id < right.id ? 1 : left.id > right.id ? -1 : 0;
    });
  }

  private priorityGroup(
    status: string,
    unreadCount: number,
    direction?: string,
  ): number {
    const closed = status === "RESOLVED" || status === "ARCHIVED";
    if (closed) return 5;
    if (direction === "INBOUND" && unreadCount > 0) return 1;
    if (direction === "INBOUND") return 2;
    if (direction === "OUTBOUND") return 3;
    return 4;
  }

  private async applyListCursor(
    where: Prisma.ConversationWhereInput,
    organizationId: string,
    cursor: string,
  ): Promise<Prisma.ConversationWhereInput> {
    let anchor = await this.prisma.conversation.findFirst({
      where: { id: cursor, organizationId, ...notDeleted },
      select: { id: true, lastMessageAt: true, unreadCount: true, updatedAt: true },
    });

    if (!anchor) {
      const parsed = new Date(cursor);
      if (!Number.isNaN(parsed.getTime())) {
        anchor = {
          id: "",
          lastMessageAt: parsed,
          unreadCount: 0,
          updatedAt: parsed,
        };
      }
    }

    if (!anchor) return where;

    const anchorLastMessageAt = anchor.lastMessageAt ?? new Date(0);
    const cursorFilter: Prisma.ConversationWhereInput = {
      OR: [
        { lastMessageAt: { lt: anchorLastMessageAt } },
        {
          lastMessageAt: anchorLastMessageAt,
          unreadCount: { lt: anchor.unreadCount },
        },
        {
          lastMessageAt: anchorLastMessageAt,
          unreadCount: anchor.unreadCount,
          updatedAt: { lt: anchor.updatedAt },
        },
        {
          lastMessageAt: anchorLastMessageAt,
          unreadCount: anchor.unreadCount,
          updatedAt: anchor.updatedAt,
          id: { lt: anchor.id },
        },
      ],
    };

    return { AND: [where, cursorFilter] };
  }

  async findAll(organizationId: string, query: QueryConversationsDto) {
    const pageSize = query.pageSize ?? 20;
    let where = this.buildListWhere(organizationId, query);

    const replyStatus =
      query.replyStatus ??
      (query.awaitingReply ? ("mine" as const) : undefined);
    if (replyStatus === "mine" || replyStatus === "customer") {
      const direction =
        replyStatus === "mine" ? ("INBOUND" as const) : ("OUTBOUND" as const);
      const ids = await this.filterIdsByLastMessageDirection(
        organizationId,
        direction,
      );
      where = {
        AND: [where, { id: { in: ids } }],
      };
    }

    if (query.cursor) {
      where = await this.applyListCursor(where, organizationId, query.cursor);
      const orderBy: Prisma.ConversationOrderByWithRelationInput[] = [
        { lastMessageAt: "desc" },
        { unreadCount: "desc" },
        { updatedAt: "desc" },
      ];
      const data = await this.prisma.conversation.findMany({
        where,
        take: pageSize,
        orderBy,
        include: LIST_INCLUDE,
      });
      const previews = await this.loadLastMessagePreviews(data.map((c) => c.id));
      return {
        data: data.map((conversation) =>
          toConversationListItem({
            ...conversation,
            lastMessagePreview: previews.get(conversation.id) ?? null,
          }),
        ),
        meta: {
          pageSize,
          hasMore: data.length === pageSize,
          nextCursor: data.length ? data[data.length - 1]!.id : null,
        },
      };
    }

    const page = query.page ?? 1;
    const { skip, take } = paginationArgs(page, pageSize);

    const candidates = await this.prisma.conversation.findMany({
      where,
      select: {
        id: true,
        status: true,
        unreadCount: true,
        lastMessageAt: true,
        updatedAt: true,
      },
    });
    const directions = await this.loadLastMessageDirections(
      candidates.map((row) => row.id),
    );
    const sorted = this.sortCandidatesByPriority(candidates, directions);
    const total = sorted.length;
    const pageIds = sorted.slice(skip, skip + take).map((row) => row.id);

    if (!pageIds.length) {
      return paginate([], total, page, pageSize);
    }

    const rows = await this.prisma.conversation.findMany({
      where: { id: { in: pageIds }, organizationId, ...notDeleted },
      include: LIST_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = pageIds
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const previews = await this.loadLastMessagePreviews(ordered.map((c) => c.id));
    return paginate(
      ordered.map((conversation) =>
        toConversationListItem({
          ...conversation,
          lastMessagePreview: previews.get(conversation.id) ?? null,
        }),
      ),
      total,
      page,
      pageSize,
    );
  }

  private async loadLastMessagePreviews(conversationIds: string[]) {
    const map = new Map<string, string | null>();
    if (!conversationIds.length) return map;

    const messages = await this.prisma.message.findMany({
      where: { conversationId: { in: conversationIds }, ...notDeleted },
      orderBy: { sentAt: "desc" },
      distinct: ["conversationId"],
      select: { conversationId: true, body: true },
    });

    for (const message of messages) {
      map.set(message.conversationId, message.body ?? null);
    }
    return map;
  }

  async findOne(organizationId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: DETAIL_INCLUDE,
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    const preview = await this.latestMessagePreview(id);
    const { contact, deal, channel, assignee, ...rest } = conversation;

    return {
      ...rest,
      lastMessageAt: rest.lastMessageAt ?? preview.lastMessageAt,
      lastMessagePreview: preview.lastMessagePreview,
      contact: contact ? toContactResponse(contact) : null,
      assignee: assignee ?? null,
      channel: toChannelSummary(channel),
      deal: deal
        ? {
            id: deal.id,
            name: deal.name,
            pipelineId: deal.pipelineId,
            stageId: deal.stageId,
            priority: deal.priority,
            pipeline: deal.pipeline
              ? { id: deal.pipeline.id, name: deal.pipeline.name, color: deal.pipeline.color }
              : null,
            stage: deal.stage ? toPipelineStageResponse(deal.stage) : null,
            owner: deal.owner ?? null,
            tags: mergeConversationTags(null, deal),
          }
        : null,
    };
  }

  async getContext(organizationId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        contact: {
          include: {
            company: true,
            tags: { include: { tag: true } },
            team: { select: { id: true, name: true } },
            owner: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        channel: {
          select: {
            id: true,
            type: true,
            name: true,
            displayName: true,
            provider: true,
            externalAccountId: true,
            status: true,
          },
        },
        deal: {
          where: notDeleted,
          include: {
            pipeline: true,
            stage: true,
            owner: { select: { id: true, name: true, avatarUrl: true } },
            team: { select: { id: true, name: true } },
            tags: { include: { tag: true } },
          },
        },
      },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    const contactId = conversation.contactId;
    const dealId = conversation.deal?.id ?? null;
    const entityScope = {
      OR: [
        { conversationId: id },
        ...(contactId ? [{ contactId }] : []),
        ...(dealId ? [{ dealId }] : []),
      ],
    };

    const noteScope = {
      organizationId,
      ...notDeleted,
      OR: [
        ...(contactId ? [{ contactId }] : []),
        ...(dealId ? [{ dealId }] : []),
      ],
    };

    const taskScope = {
      organizationId,
      ...notDeleted,
      OR: [
        ...(contactId ? [{ contactId }] : []),
        ...(dealId ? [{ dealId }] : []),
      ],
    };

    const orderScope = {
      organizationId,
      ...notDeleted,
      OR: [
        ...(contactId ? [{ contactId }] : []),
        ...(dealId ? [{ dealId }] : []),
      ],
    };

    const [
      preview,
      notesCount,
      tasksCount,
      ordersCount,
      activitiesCount,
      filesCount,
      nextTask,
      lastOrder,
    ] = await Promise.all([
      this.latestMessagePreview(id),
      this.prisma.note.count({ where: noteScope }),
      this.prisma.task.count({ where: taskScope }),
      this.prisma.order.count({ where: orderScope }),
      this.prisma.activity.count({ where: { organizationId, ...entityScope } }),
      this.prisma.messageAttachment.count({
        where: {
          message: { conversationId: id, ...notDeleted },
        },
      }),
      this.prisma.task.findFirst({
        where: {
          ...taskScope,
          status: "PENDING",
          dueAt: { not: null },
        },
        orderBy: { dueAt: "asc" },
        select: {
          id: true,
          title: true,
          dueAt: true,
          status: true,
          priority: true,
          assignee: { select: { id: true, name: true } },
        },
      }),
      this.prisma.order.findFirst({
        where: orderScope,
        orderBy: { orderedAt: "desc" },
        select: {
          id: true,
          number: true,
          status: true,
          finalValue: true,
          orderedAt: true,
        },
      }),
    ]);

    const { contact, deal, channel, assignee, ...rest } = conversation;

    return {
      conversation: {
        id: rest.id,
        status: rest.status,
        subject: rest.subject,
        unreadCount: rest.unreadCount,
        lastMessageAt: rest.lastMessageAt ?? preview.lastMessageAt,
        lastMessagePreview: preview.lastMessagePreview,
        assignee: assignee ?? null,
      },
      contact: contact ? toContactResponse(contact) : null,
      company: contact?.company ? toCompanyResponse(contact.company) : null,
      currentDeal: deal
        ? {
            ...toCurrentDealSummary(deal),
            owner: deal.owner ?? null,
            team: deal.team ?? null,
          }
        : null,
      pipeline: deal?.pipeline ? toPipelineResponse(deal.pipeline) : null,
      stage: deal?.stage ? toPipelineStageResponse(deal.stage) : null,
      owner: deal?.owner ?? contact?.owner ?? null,
      team: deal?.team ?? contact?.team ?? null,
      channel: toChannelSummary(channel),
      tags: mergeConversationTags(contact, deal),
      nextTask,
      lastOrder,
      counts: {
        notesCount,
        filesCount,
        tasksCount,
        ordersCount,
        activitiesCount,
      },
    };
  }

  async markAsRead(organizationId: string, id: string) {
    await this.assertConversationExists(organizationId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { unreadCount: 0 },
      select: { id: true, unreadCount: true, updatedAt: true },
    });
  }

  async create(organizationId: string, dto: CreateConversationDto, userId: string) {
    return this.prisma.conversation.create({
      data: {
        contactId: dto.contactId,
        subject: dto.subject,
        organizationId,
        status: (dto.status as never) ?? "OPEN",
        assigneeId: dto.assigneeId ?? userId,
        lastMessageAt: new Date(),
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateConversationDto) {
    await this.assertConversationExists(organizationId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: {
        contactId: dto.contactId,
        subject: dto.subject,
        status: dto.status as never,
        assigneeId: dto.assigneeId,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.assertConversationExists(organizationId, id);
    return this.prisma.conversation.update({ where: { id }, data: softDeleteData() });
  }

  async sendMessage(
    organizationId: string,
    conversationId: string,
    dto: SendMessageDto,
    userId: string,
    files: Express.Multer.File[] = [],
  ) {
    const conversation = await this.assertConversationExists(organizationId, conversationId);
    const now = new Date();
    const direction =
      dto.direction === "inbound" ? ("INBOUND" as const) : ("OUTBOUND" as const);
    const trimmedBody = dto.body?.trim() ?? "";
    const hasFiles = files.length > 0;

    if (!trimmedBody && !hasFiles) {
      throw new BadRequestException("Informe uma mensagem ou anexe um arquivo.");
    }

    const savedUploads = files.map((file) => validateAndSaveUpload(file));
    const isAutomation = dto.senderType === "automation";
    const senderId =
      direction === "OUTBOUND" && !isAutomation ? userId : null;

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        body: trimmedBody || null,
        direction,
        senderId,
        status: "SENT",
        sentAt: now,
        metadata: {
          crmOnly: true,
          contentType: dto.contentType ?? (hasFiles ? "multipart" : "text"),
          ...(isAutomation ? { senderType: "automation" } : {}),
        },
        attachments: savedUploads.length
          ? {
              create: savedUploads.map((upload) => ({
                fileName: upload.originalName,
                mimeType: upload.mimeType,
                fileSize: upload.fileSize,
                url: upload.url,
                kind: upload.kind,
              })),
            }
          : undefined,
      },
      include: {
        attachments: true,
        sender: { select: { id: true, name: true } },
      },
    });

    const preview =
      trimmedBody ||
      (savedUploads[0]
        ? `Anexo: ${savedUploads[0].originalName}`
        : "Nova mensagem");

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now, unreadCount: 0 },
    });

    await this.prisma.activity.create({
      data: {
        organizationId,
        type: "MESSAGE_SENT",
        title: "Mensagem enviada",
        description: preview.slice(0, 200),
        contactId: conversation.contactId,
        conversationId,
        actorId: userId,
      },
    });

    return message;
  }

  private async resolveMessageCursor(
    conversationId: string,
    cursor: string,
  ): Promise<{ sentAt: Date; id: string } | null> {
    const byId = await this.prisma.message.findFirst({
      where: { id: cursor, conversationId, ...notDeleted },
      select: { id: true, sentAt: true },
    });
    if (byId) return byId;

    const parsed = new Date(cursor);
    if (!Number.isNaN(parsed.getTime())) {
      return { id: "", sentAt: parsed };
    }
    return null;
  }

  async listMessages(
    organizationId: string,
    conversationId: string,
    query: QueryMessagesDto,
  ) {
    await this.assertConversationExists(organizationId, conversationId);
    const pageSize = Math.min(query.pageSize ?? 50, 200);
    const baseWhere: Prisma.MessageWhereInput = {
      conversationId,
      ...notDeleted,
    };

    let rows: Array<
      Prisma.MessageGetPayload<{
        include: { attachments: true; sender: { select: { id: true; name: true } } };
      }>
    >;

    if (query.cursor) {
      const anchor = await this.resolveMessageCursor(conversationId, query.cursor);
      if (anchor) {
        if (query.before) {
          rows = await this.prisma.message.findMany({
            where: {
              ...baseWhere,
              OR: [
                { sentAt: { lt: anchor.sentAt } },
                { sentAt: anchor.sentAt, id: { lt: anchor.id || undefined } },
              ],
            },
            orderBy: [{ sentAt: "desc" }, { id: "desc" }],
            take: pageSize,
            include: {
              attachments: true,
              sender: { select: { id: true, name: true } },
            },
          });
          rows.reverse();
        } else {
          rows = await this.prisma.message.findMany({
            where: {
              ...baseWhere,
              OR: [
                { sentAt: { gt: anchor.sentAt } },
                { sentAt: anchor.sentAt, id: { gt: anchor.id || undefined } },
              ],
            },
            orderBy: [{ sentAt: "asc" }, { id: "asc" }],
            take: pageSize,
            include: {
              attachments: true,
              sender: { select: { id: true, name: true } },
            },
          });
        }
      } else {
        rows = [];
      }
    } else {
      rows = await this.prisma.message.findMany({
        where: baseWhere,
        orderBy: [{ sentAt: "desc" }, { id: "desc" }],
        take: pageSize,
        include: {
          attachments: true,
          sender: { select: { id: true, name: true } },
        },
      });
      rows.reverse();
    }

    const hasMore = rows.length === pageSize;
    const nextCursor =
      rows.length && query.before !== false ? rows[0]!.id : rows.length ? rows[rows.length - 1]!.id : null;

    return {
      data: rows,
      meta: {
        pageSize,
        hasMore,
        nextCursor,
      },
    };
  }
}
