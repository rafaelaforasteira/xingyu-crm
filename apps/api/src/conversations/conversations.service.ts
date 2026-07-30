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
      ...(query.channel ? { channel: query.channel } : {}),
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
          contact: { select: { id: true, name: true, whatsapp: true } },
          assignee: { select: { id: true, name: true } },
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
        messages: { orderBy: { createdAt: "asc" }, take: 200 },
      },
    });
    if (!conversation) throw new NotFoundException(`Conversation ${id} not found`);
    return conversation;
  }

  async create(organizationId: string, dto: CreateConversationDto, userId: string) {
    return this.prisma.conversation.create({
      data: {
        ...dto,
        organizationId,
        channel: dto.channel ?? "whatsapp",
        status: dto.status ?? "OPEN",
        assigneeId: dto.assigneeId ?? userId,
        lastMessageAt: new Date(),
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateConversationDto) {
    await this.findOne(organizationId, id);
    return this.prisma.conversation.update({ where: { id }, data: dto });
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
        organizationId,
        body: dto.body,
        direction: dto.direction ?? "outbound",
        channel: dto.channel ?? conversation.channel,
        contentType: dto.contentType ?? "text",
        senderId: userId,
        demoMode: true,
        status: "SENT",
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
        userId,
      },
    });

    return message;
  }

  async listMessages(organizationId: string, conversationId: string, query: QueryConversationsDto) {
    await this.findOne(organizationId, conversationId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = { conversationId, organizationId, ...notDeleted };
    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.message.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }
}
