import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { softDeleteData, notDeleted } from "../common/utils/soft-delete";
import { CreateNoteDto, UpdateNoteDto, QueryNotesDto } from "./dto/note.dto";

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: QueryNotesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
      ...(query.orderId ? { orderId: query.orderId } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.note.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          generatedTasks: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: { statusDefinition: true },
          },
        },
      }),
      this.prisma.note.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        generatedTasks: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { statusDefinition: true },
        },
      },
    });
    if (!note) throw new NotFoundException(`Note ${id} not found`);
    return note;
  }

  async create(organizationId: string, dto: CreateNoteDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const note = await tx.note.create({
        data: { ...dto, organizationId, authorId: userId },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          generatedTasks: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: { statusDefinition: true },
          },
        },
      });
      if (note.dealId) {
        await tx.activity.create({
          data: {
            organizationId,
            dealId: note.dealId,
            contactId: note.contactId,
            actorId: userId,
            type: "NOTE_CREATED",
            title: "Note added",
            metadata: { noteId: note.id },
          },
        });
      }
      return note;
    });
  }

  async update(organizationId: string, id: string, dto: UpdateNoteDto) {
    await this.findOne(organizationId, id);
    return this.prisma.note.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.note.update({ where: { id }, data: softDeleteData() });
  }
}
