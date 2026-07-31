import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateNotificationDto,
  UpdateNotificationDto,
  QueryNotificationsDto,
} from "./dto/notification.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryNotificationsDto, userId: string) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      userId: query.userId ?? userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const item = await this.prisma.notification.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!item) throw new NotFoundException(`Notification ${id} not found`);
    return item;
  }

  async create(organizationId: string, dto: CreateNotificationDto, userId: string) {
    return this.prisma.notification.create({
      data: {
        title: dto.title,
        body: dto.body,
        organizationId,
        userId: dto.userId ?? userId,
        type: (dto.type as never) ?? "SYSTEM",
        href: dto.link,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateNotificationDto) {
    await this.findOne(organizationId, id);
    const { read, link, ...rest } = dto;
    return this.prisma.notification.update({
      where: { id },
      data: {
        ...rest,
        ...(link !== undefined ? { href: link } : {}),
        ...(read === true ? { readAt: new Date() } : {}),
        ...(read === false ? { readAt: null } : {}),
      } as never,
    });
  }

  async markRead(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(organizationId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { organizationId, userId, readAt: null, ...notDeleted },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.notification.update({ where: { id }, data: softDeleteData() });
  }
}
