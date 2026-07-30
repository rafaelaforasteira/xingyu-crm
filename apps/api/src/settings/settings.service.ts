import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateTeamDto,
  UpdateTeamDto,
  CreateTagDto,
  UpdateTagDto,
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  UpdateUserDto,
  QuerySettingsDto,
} from "./dto/settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(organizationId: string) {
    const [organization, users, teams, tags, pipelines] = await Promise.all([
      this.prisma.organization.findFirst({ where: { id: organizationId } }),
      this.prisma.user.count({ where: { organizationId, ...notDeleted } }),
      this.prisma.team.count({ where: { organizationId, ...notDeleted } }),
      this.prisma.tag.count({ where: { organizationId, ...notDeleted } }),
      this.prisma.pipeline.count({ where: { organizationId, ...notDeleted } }),
    ]);
    return { organization, counts: { users, teams, tags, pipelines } };
  }

  async listUsers(organizationId: string, query: QuerySettingsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = {
      organizationId,
      ...notDeleted,
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: { team: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async updateUser(organizationId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const { active, ...rest } = dto;
    return this.prisma.user.update({
      where: { id },
      data: {
        ...rest,
        ...(active !== undefined ? { status: active ? "ACTIVE" : "INACTIVE" } : {}),
      } as never,
    });
  }

  async listTeams(organizationId: string, query: QuerySettingsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = { organizationId, ...notDeleted };
    const [data, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip,
        take,
        include: { _count: { select: { members: true } } },
        orderBy: { name: "asc" },
      }),
      this.prisma.team.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createTeam(organizationId: string, dto: CreateTeamDto) {
    return this.prisma.team.create({ data: { ...dto, organizationId } });
  }

  async updateTeam(organizationId: string, id: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!team) throw new NotFoundException(`Team ${id} not found`);
    return this.prisma.team.update({ where: { id }, data: dto });
  }

  async removeTeam(organizationId: string, id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!team) throw new NotFoundException(`Team ${id} not found`);
    return this.prisma.team.update({ where: { id }, data: softDeleteData() });
  }

  async listTags(organizationId: string, query: QuerySettingsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = {
      organizationId,
      ...notDeleted,
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.tag.findMany({ where, skip, take, orderBy: { name: "asc" } }),
      this.prisma.tag.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createTag(organizationId: string, dto: CreateTagDto) {
    return this.prisma.tag.create({ data: { ...dto, organizationId } });
  }

  async updateTag(organizationId: string, id: string, dto: UpdateTagDto) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!tag) throw new NotFoundException(`Tag ${id} not found`);
    return this.prisma.tag.update({ where: { id }, data: dto });
  }

  async removeTag(organizationId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!tag) throw new NotFoundException(`Tag ${id} not found`);
    return this.prisma.tag.update({ where: { id }, data: softDeleteData() });
  }

  async listCustomFields(organizationId: string, query: QuerySettingsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = { organizationId, ...notDeleted };
    const [data, total] = await Promise.all([
      this.prisma.customFieldDefinition.findMany({ where, skip, take, orderBy: { name: "asc" } }),
      this.prisma.customFieldDefinition.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createCustomField(organizationId: string, dto: CreateCustomFieldDto) {
    return this.prisma.customFieldDefinition.create({
      data: {
        name: dto.name,
        key: dto.key,
        fieldType: dto.fieldType as never,
        entityType: dto.entity as never,
        organizationId,
        options: (dto.options ?? {}) as never,
        required: dto.required ?? false,
      } as never,
    });
  }

  async updateCustomField(organizationId: string, id: string, dto: UpdateCustomFieldDto) {
    const field = await this.prisma.customFieldDefinition.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!field) throw new NotFoundException(`Custom field ${id} not found`);
    const { entity, ...rest } = dto;
    return this.prisma.customFieldDefinition.update({
      where: { id },
      data: {
        ...rest,
        ...(entity ? { entityType: entity as never } : {}),
        ...(dto.fieldType ? { fieldType: dto.fieldType as never } : {}),
        ...(dto.options ? { options: dto.options as never } : {}),
      } as never,
    });
  }

  async removeCustomField(organizationId: string, id: string) {
    const field = await this.prisma.customFieldDefinition.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!field) throw new NotFoundException(`Custom field ${id} not found`);
    return this.prisma.customFieldDefinition.update({ where: { id }, data: softDeleteData() });
  }

  integrationsStatus() {
    const flag = (key: string) => Boolean(process.env[key]?.trim());
    return {
      shopify: { configured: flag("SHOPIFY_ACCESS_TOKEN"), mode: "mock", status: "demo" },
      whatsapp: { configured: flag("WHATSAPP_API_TOKEN"), mode: "mock", status: "demo" },
      instagram: { configured: flag("INSTAGRAM_ACCESS_TOKEN"), mode: "mock", status: "demo" },
      metaAds: { configured: flag("META_ADS_ACCESS_TOKEN"), mode: "mock", status: "demo" },
      googleAnalytics: {
        configured: flag("GOOGLE_ANALYTICS_MEASUREMENT_ID"),
        mode: "mock",
        status: "demo",
      },
      webhooks: { configured: flag("WEBHOOK_SECRET"), mode: "mock", status: "demo" },
    };
  }
}
