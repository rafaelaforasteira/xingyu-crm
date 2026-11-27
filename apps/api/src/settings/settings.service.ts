import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthRole } from "@xingyu/database";
import { accessMatrix } from "../auth/access-policy";
import { normalizePhone } from "../common/phone-normalization";
import { validateAndSaveUpload } from "../common/upload/upload.util";
import { PrismaService } from "../prisma/prisma.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted, softDeleteData } from "../common/utils/soft-delete";
import {
  CreateTeamDto,
  UpdateTeamDto,
  ArchiveTeamDto,
  CreateTagDto,
  UpdateTagDto,
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  UpdateUserDto,
  QuerySettingsDto,
  UpdateProfileDto,
  UpdateOrganizationDto,
} from "./dto/settings.dto";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  avatarUrl: true,
  title: true,
  authRole: true,
  status: true,
  teamId: true,
  team: { select: { id: true, name: true } },
} as const;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(organizationId: string, userId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId, ...notDeleted }, select: { id:true, name:true, email:true, phone:true, avatarUrl:true, title:true, authRole:true, status:true, locale:true, timezone:true, team:{select:{id:true,name:true}} } });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    return user;
  }

  async updateProfile(organizationId: string, userId: string, dto: UpdateProfileDto) {
    await this.profile(organizationId, userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined
          ? { phone: dto.phone.trim() ? normalizePhone(dto.phone) : null }
          : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() || null } : {}),
        ...(dto.locale !== undefined ? { locale: dto.locale } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        title: true,
        authRole: true,
        status: true,
        locale: true,
        timezone: true,
        team: { select: { id: true, name: true } },
      },
    });
  }

  async uploadAvatar(
    organizationId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    await this.profile(organizationId, userId);
    const mime = (file?.mimetype || "").toLowerCase();
    const allowed = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ]);
    if (!allowed.has(mime)) {
      throw new BadRequestException("Use JPG, PNG ou WEBP.");
    }
    const maxAvatarBytes = 5 * 1024 * 1024;
    if (file.size > maxAvatarBytes) {
      throw new BadRequestException("Arquivo muito grande. Limite: 5 MB.");
    }
    const saved = validateAndSaveUpload(file);
    if (saved.kind !== "image") {
      throw new BadRequestException("Tipo de arquivo não permitido.");
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: saved.url },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        title: true,
        authRole: true,
        status: true,
        locale: true,
        timezone: true,
        team: { select: { id: true, name: true } },
      },
    });
  }

  permissions() {
    return {
      roles: ["ADMIN", "MANAGER", "CONSULTANT"] as const,
      rows: accessMatrix(),
    };
  }

  async updateOrganization(organizationId: string, dto: UpdateOrganizationDto) {
    const organization = await this.prisma.organization.findFirst({ where: { id: organizationId, deletedAt: null } });
    if (!organization) throw new NotFoundException("Organização não encontrada");
    return this.prisma.organization.update({ where: { id: organizationId }, data: dto });
  }

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
      ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: publicUserSelect,
        orderBy: { name: "asc" },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async updateUser(organizationId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, ...notDeleted },
      select: { id: true, authRole: true, status: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const nextRole =
      dto.role && Object.values(AuthRole).includes(dto.role as AuthRole)
        ? (dto.role as AuthRole)
        : undefined;
    if (
      user.authRole === AuthRole.ADMIN &&
      ((nextRole && nextRole !== AuthRole.ADMIN) || dto.active === false)
    ) {
      const admins = await this.prisma.user.count({
        where: {
          organizationId,
          authRole: AuthRole.ADMIN,
          status: "ACTIVE",
          deletedAt: null,
        },
      });
      if (admins <= 1) {
        throw new BadRequestException(
          "A organização deve manter ao menos um administrador ativo.",
        );
      }
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.teamId !== undefined ? { teamId: dto.teamId || null } : {}),
        ...(nextRole ? { authRole: nextRole } : {}),
        ...(dto.active !== undefined
          ? { status: dto.active ? "ACTIVE" : "INACTIVE" }
          : {}),
      },
      select: publicUserSelect,
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
        include: {
          _count: { select: { members: { where: { deletedAt: null } } } },
        },
        orderBy: { name: "asc" },
      }),
      this.prisma.team.count({ where }),
    ]);
    const teamIds = data.map((team) => team.id);
    const memberRows =
      teamIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { organizationId, deletedAt: null, teamId: { in: teamIds } },
            select: { id: true, name: true, avatarUrl: true, teamId: true },
            orderBy: { name: "asc" },
          });
    const previewByTeam = new Map<string, Array<{ id: string; name: string; avatarUrl: string | null }>>();
    for (const row of memberRows) {
      if (!row.teamId) continue;
      const list = previewByTeam.get(row.teamId) ?? [];
      if (list.length < 5) {
        list.push({ id: row.id, name: row.name, avatarUrl: row.avatarUrl });
        previewByTeam.set(row.teamId, list);
      }
    }
    return paginate(
      data.map((team) => ({
        id: team.id,
        name: team.name,
        description: team.description,
        memberCount: team._count.members,
        memberPreview: previewByTeam.get(team.id) ?? [],
        _count: team._count,
      })),
      total,
      page,
      pageSize,
    );
  }

  private async assertUniqueTeamName(organizationId: string, name: string, excludeId?: string) {
    const duplicate = await this.prisma.team.findFirst({
      where: {
        organizationId,
        ...notDeleted,
        name: { equals: name, mode: "insensitive" },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException("Já existe uma equipe com este nome.");
  }

  async createTeam(organizationId: string, dto: CreateTeamDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Nome da equipe é obrigatório.");
    await this.assertUniqueTeamName(organizationId, name);
    return this.prisma.team.create({
      data: {
        organizationId,
        name,
        description: dto.description?.trim() || null,
      },
    });
  }

  async updateTeam(organizationId: string, id: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!team) throw new NotFoundException(`Team ${id} not found`);
    const name = dto.name !== undefined ? dto.name.trim() : undefined;
    if (name !== undefined) {
      if (!name) throw new BadRequestException("Nome da equipe é obrigatório.");
      await this.assertUniqueTeamName(organizationId, name, id);
    }
    return this.prisma.team.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
      },
    });
  }

  private async loadEligibleUsers(organizationId: string, userIds: string[]) {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueIds.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { organizationId, id: { in: uniqueIds }, deletedAt: null },
      select: { id: true, status: true, teamId: true },
    });
    if (users.length !== uniqueIds.length) {
      throw new BadRequestException("Um ou mais usuários não pertencem a esta organização.");
    }
    if (users.some((user) => user.status === "INACTIVE")) {
      throw new BadRequestException("Usuários inativos não podem ser adicionados à equipe.");
    }
    return users;
  }

  async addTeamMembers(organizationId: string, teamId: string, userIds: string[]) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, organizationId, ...notDeleted },
      select: { id: true },
    });
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);
    const users = await this.loadEligibleUsers(organizationId, userIds);
    const ids = users.map((user) => user.id);
    if (ids.length === 0) return { added: 0 };
    await this.prisma.user.updateMany({
      where: { organizationId, id: { in: ids }, deletedAt: null },
      data: { teamId },
    });
    return { added: ids.length };
  }

  async replaceTeamMembers(organizationId: string, teamId: string, userIds: string[]) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, organizationId, ...notDeleted },
      select: { id: true },
    });
    if (!team) throw new NotFoundException(`Team ${teamId} not found`);
    const desired = await this.loadEligibleUsers(organizationId, userIds);
    const desiredIds = new Set(desired.map((user) => user.id));
    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: {
          organizationId,
          teamId,
          deletedAt: null,
          ...(desiredIds.size ? { id: { notIn: [...desiredIds] } } : {}),
        },
        data: { teamId: null },
      });
      if (desiredIds.size) {
        await tx.user.updateMany({
          where: { organizationId, id: { in: [...desiredIds] }, deletedAt: null },
          data: { teamId },
        });
      }
    });
    return { memberCount: desiredIds.size };
  }

  async archiveTeam(organizationId: string, id: string, dto: ArchiveTeamDto = {}) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId, ...notDeleted },
    });
    if (!team) throw new NotFoundException(`Team ${id} not found`);
    const memberAction = dto.memberAction ?? "detach";
    if (memberAction === "move") {
      if (!dto.targetTeamId) throw new BadRequestException("Selecione a equipe de destino.");
      if (dto.targetTeamId === id) {
        throw new BadRequestException("Não é possível mover membros para a própria equipe.");
      }
      const target = await this.prisma.team.findFirst({
        where: { id: dto.targetTeamId, organizationId, ...notDeleted },
        select: { id: true },
      });
      if (!target) throw new BadRequestException("Equipe de destino inválida.");
    }
    await this.prisma.$transaction(async (tx) => {
      if (memberAction === "move" && dto.targetTeamId) {
        await tx.user.updateMany({
          where: { organizationId, teamId: id, deletedAt: null },
          data: { teamId: dto.targetTeamId },
        });
      } else {
        await tx.user.updateMany({
          where: { organizationId, teamId: id, deletedAt: null },
          data: { teamId: null },
        });
      }
      await tx.team.update({ where: { id }, data: softDeleteData() });
    });
    return { id, archived: true };
  }

  async removeTeam(organizationId: string, id: string) {
    return this.archiveTeam(organizationId, id, { memberAction: "detach" });
  }

  async listTags(organizationId: string, query: QuerySettingsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = {
      organizationId,
      ...notDeleted,
      ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.tag.findMany({ where, skip, take, orderBy: { name: "asc" } }),
      this.prisma.tag.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createTag(organizationId: string, dto: CreateTagDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Tag name is required");
    const duplicate = await this.prisma.tag.findFirst({
      where: { organizationId, name: { equals: name, mode: "insensitive" }, ...notDeleted },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException("A tag with this name already exists");
    return this.prisma.tag.create({ data: { ...dto, name, organizationId } });
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
