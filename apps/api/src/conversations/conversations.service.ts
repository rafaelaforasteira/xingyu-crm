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
    const channelFilter = query.channelId ?? query.integrationAccountId;
    const andFilters: Prisma.ConversationWhereInput[] = [];

    if (query.pipelineId) {
      andFilters.push({ deal: { pipelineId: query.pipelineId, ...notDeleted } });
    }
    if (query.stageId) {
      andFilters.push({ deal: { stageId: query.stageId, ...notDeleted } });
    }
    if (query.teamId) {
      andFilters.push({
        OR: [
          { deal: { teamId: query.teamId, ...notDeleted } },
          { contact: { teamId: query.teamId, ...notDeleted } },
        ],
      });
    }
    if (query.tagId) {
      andFilters.push({
        OR: [
          { contact: { tags: { some: { tagId: query.tagId } }, ...notDeleted } },
          { deal: { tags: { some: { tagId: query.tagId } }, ...notDeleted } },
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

    return {
      organizationId,
      ...notDeleted,
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.withoutAssignee ? { assigneeId: null } : {}),
      ...(query.unreadOnly ? { unreadCount: { gt: 0 } } : {}),
      ...(channelFilter ? { channelId: channelFilter } : {}),
      ...(andFilters.length ? { AND: andFilters } : {}),
    };
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

    if (query.awaitingReply) {
      const awaitingIds = await this.prisma.$queryRaw<Array<{ id: string }>>`
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
          AND last_msg.direction = 'INBOUND'
      `;
      where = {
        AND: [where, { id: { in: awaitingIds.map((row) => row.id) } }],
      };
    }

    if (query.cursor) {
      where = await this.applyListCursor(where, organizationId, query.cursor);
    }

    const orderBy: Prisma.ConversationOrderByWithRelationInput[] = [
      { lastMessageAt: "desc" },
      { unreadCount: "desc" },
      { updatedAt: "desc" },
    ];

    if (query.cursor) {
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
    const [rows, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take,
        orderBy,
        include: LIST_INCLUDE,
      }),
      this.prisma.conversation.count({ where }),
    ]);
    const previews = await this.loadLastMessagePreviews(rows.map((c) => c.id));
    return paginate(
      rows.map((conversation) =>
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
