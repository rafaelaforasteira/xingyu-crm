import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateContactDto,
  UpdateContactDto,
  QueryContactsDto,
  BulkTagsDto,
  BulkOwnerDto,
  BulkArchiveDto,
  MergeContactsDto,
  DuplicateCheckDto,
} from "./dto/contact.dto";

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  private contactNameFilter(search: string) {
    return {
      OR: [
        { firstName: { contains: search, mode: "insensitive" as const } },
        { lastName: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { whatsapp: { contains: search, mode: "insensitive" as const } },
      ],
    };
  }

  async findAll(organizationId: string, query: QueryContactsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);

    const where: Record<string, unknown> = {
      organizationId,
      ...notDeleted,
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.teamId ? { teamId: query.teamId } : {}),
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
      ...(query.search ? this.contactNameFilter(query.search) : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip,
        take,
        orderBy: { [query.sortBy ?? "updatedAt"]: query.sortOrder ?? "desc" },
        include: {
          company: true,
          owner: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        company: true,
        owner: { select: { id: true, name: true } },
        tags: { include: { tag: true } },
        deals: { where: notDeleted, take: 10, orderBy: { updatedAt: "desc" } },
        notes: { where: notDeleted, take: 20, orderBy: { createdAt: "desc" } },
      },
    });
    if (!contact) throw new NotFoundException(`Contact ${id} not found`);
    return contact;
  }

  async create(organizationId: string, dto: CreateContactDto, userId: string) {
    const { tagIds, notes, ...data } = dto as CreateContactDto & { notes?: string; tagIds?: string[] };
    return this.prisma.contact.create({
      data: {
        ...data,
        observations: notes,
        organizationId,
        ownerId: data.ownerId ?? userId,
        type: data.type as never,
        status: data.status as never,
        ...(tagIds?.length
          ? { tags: { create: tagIds.map((tagId) => ({ tagId })) } }
          : {}),
      } as never,
      include: { tags: { include: { tag: true } }, company: true },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateContactDto) {
    await this.findOne(organizationId, id);
    const { tagIds, notes, ...data } = dto as UpdateContactDto & { notes?: string; tagIds?: string[] };
    return this.prisma.contact.update({
      where: { id },
      data: {
        ...data,
        ...(notes !== undefined ? { observations: notes } : {}),
        type: data.type as never,
        status: data.status as never,
        ...(tagIds
          ? {
              tags: {
                deleteMany: {},
                create: tagIds.map((tagId) => ({ tagId })),
              },
            }
          : {}),
      } as never,
      include: { tags: { include: { tag: true } }, company: true },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.findOne(organizationId, id);
    return this.prisma.contact.update({
      where: { id },
      data: softDeleteData(),
    });
  }

  async bulkTags(organizationId: string, dto: BulkTagsDto) {
    const mode = dto.mode ?? "add";
    for (const contactId of dto.contactIds) {
      await this.findOne(organizationId, contactId);
      if (mode === "set") {
        await this.prisma.contactTag.deleteMany({ where: { contactId } });
        await this.prisma.contactTag.createMany({
          data: dto.tagIds.map((tagId) => ({ contactId, tagId })),
          skipDuplicates: true,
        });
      } else if (mode === "remove") {
        await this.prisma.contactTag.deleteMany({
          where: { contactId, tagId: { in: dto.tagIds } },
        });
      } else {
        await this.prisma.contactTag.createMany({
          data: dto.tagIds.map((tagId) => ({ contactId, tagId })),
          skipDuplicates: true,
        });
      }
    }
    return { updated: dto.contactIds.length };
  }

  async bulkOwner(organizationId: string, dto: BulkOwnerDto) {
    await this.prisma.contact.updateMany({
      where: { id: { in: dto.contactIds }, organizationId, ...notDeleted },
      data: { ownerId: dto.ownerId },
    });
    return { updated: dto.contactIds.length };
  }

  async bulkArchive(organizationId: string, dto: BulkArchiveDto) {
    await this.prisma.contact.updateMany({
      where: { id: { in: dto.contactIds }, organizationId, ...notDeleted },
      data: { status: dto.archived === false ? "ACTIVE_CUSTOMER" : "ARCHIVED" },
    });
    return { updated: dto.contactIds.length };
  }

  async merge(organizationId: string, dto: MergeContactsDto) {
    if (dto.primaryId === dto.secondaryId) {
      throw new BadRequestException("Cannot merge a contact with itself");
    }
    const primary = await this.findOne(organizationId, dto.primaryId);
    const secondary = await this.findOne(organizationId, dto.secondaryId);

    await this.prisma.$transaction([
      this.prisma.deal.updateMany({
        where: { contactId: secondary.id },
        data: { contactId: primary.id },
      }),
      this.prisma.task.updateMany({
        where: { contactId: secondary.id },
        data: { contactId: primary.id },
      }),
      this.prisma.note.updateMany({
        where: { contactId: secondary.id },
        data: { contactId: primary.id },
      }),
      this.prisma.conversation.updateMany({
        where: { contactId: secondary.id },
        data: { contactId: primary.id },
      }),
      this.prisma.activity.updateMany({
        where: { contactId: secondary.id },
        data: { contactId: primary.id },
      }),
      this.prisma.contact.update({
        where: { id: secondary.id },
        data: softDeleteData(),
      }),
    ]);

    return this.findOne(organizationId, primary.id);
  }

  async checkDuplicates(organizationId: string, dto: DuplicateCheckDto) {
    const or: Record<string, unknown>[] = [];
    if (dto.email) or.push({ email: { equals: dto.email, mode: "insensitive" } });
    if (dto.phone) or.push({ phone: dto.phone });
    if (dto.whatsapp) or.push({ whatsapp: dto.whatsapp });
    if (dto.firstName) {
      or.push({ firstName: { equals: dto.firstName, mode: "insensitive" } });
    }
    if (!or.length) return { duplicates: [] };

    const duplicates = await this.prisma.contact.findMany({
      where: { organizationId, ...notDeleted, OR: or },
      take: 20,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        whatsapp: true,
      },
    });
    return { duplicates };
  }
}
