import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateConversationDto,
  UpdateConversationDto,
  QueryConversationsDto,
  SendMessageDto,
} from "./dto/conversation.dto";

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryConversationsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.search
        ? { subject: { contains: query.search, mode: "insensitive" } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip,
        take,
        orderBy: { lastMessageAt: "desc" },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, whatsapp: true } },
          assignee: { select: { id: true, name: true } },
          channel: true,
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        contact: true,
        assignee: { select: { id: true, name: true } },
        channel: true,
        messages: { orderBy: { sentAt: "asc" }, take: 200 },
      },
    });
    if (!conversation) throw new NotFoundException(`Conversation ${id} not found`);
    return conversation;
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
    await this.findOne(organizationId, id);
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
    await this.findOne(organizationId, id);
    return this.prisma.conversation.update({ where: { id }, data: softDeleteData() });
  }

  async sendMessage(
    organizationId: string,
    conversationId: string,
    dto: SendMessageDto,
    userId: string,
  ) {
    const conversation = await this.findOne(organizationId, conversationId);
    const now = new Date();

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        body: dto.body,
        direction: (dto.direction === "inbound" ? "INBOUND" : "OUTBOUND") as never,
        senderId: userId,
        status: "SENT",
        sentAt: now,
        metadata: { demoMode: true, contentType: dto.contentType ?? "text" },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: now },
    });

    await this.prisma.activity.create({
      data: {
        organizationId,
        type: "MESSAGE_SENT",
        title: "Message sent (demo)",
        description: dto.body.slice(0, 200),
        contactId: conversation.contactId,
        conversationId,
        actorId: userId,
      },
    });

    return message;
  }

  async listMessages(organizationId: string, conversationId: string, query: QueryConversationsDto) {
    await this.findOne(organizationId, conversationId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = { conversationId, ...notDeleted };
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { sentAt: "asc" },
      }),
      this.prisma.message.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }
}
