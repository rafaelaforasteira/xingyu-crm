import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ChannelAccessMode,
  ConnectionLifecycleStatus,
  Prisma,
} from "@xingyu/database";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateConnectionDto,
  ListConnectionsQueryDto,
  UpdateConnectionAccessDto,
  UpdateConnectionDto,
  UpdateConnectionRoutingDto,
} from "./dto/connection.dto";
import { lifecycleStatusesForGroup } from "./connection-status";
import { ConnectionProviderRegistry } from "./providers/connection-provider.registry";

const connectionSelect = {
  id: true,
  organizationId: true,
  type: true,
  name: true,
  provider: true,
  externalAccountId: true,
  displayAccount: true,
  lifecycleStatus: true,
  configurationComplete: true,
  connectedAt: true,
  disconnectedAt: true,
  lastActivityAt: true,
  lastInboundAt: true,
  lastOutboundAt: true,
  lastErrorAt: true,
  lastErrorCode: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  accessMode: true,
  ownerUserId: true,
  pipelineConnections: {
    where: { deletedAt: null, active: true },
    orderBy: [{ isDefault: "desc" as const }, { priority: "asc" as const }],
    select: {
      id: true,
      pipelineId: true,
      isDefault: true,
      active: true,
      priority: true,
      createDeal: true,
      pipeline: { select: { id: true, name: true } },
    },
  },
  teamAccesses: { select: { teamId: true, team: { select: { id: true, name: true } } } },
  userAccesses: { select: { userId: true, user: { select: { id: true, name: true } } } },
} satisfies Prisma.ChannelSelect;

type SelectedConnection = Prisma.ChannelGetPayload<{ select: typeof connectionSelect }>;
type DbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ConnectionProviderRegistry,
  ) {}

  async list(organizationId: string, query: ListConnectionsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const base: Prisma.ChannelWhereInput = {
      organizationId,
      deletedAt: null,
      archivedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { displayAccount: { contains: query.search, mode: "insensitive" } },
              { provider: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const statuses = lifecycleStatusesForGroup(query.status ?? "ALL");
    const where = statuses ? { ...base, lifecycleStatus: { in: statuses } } : base;
    const [rows, total, counts] = await Promise.all([
      this.prisma.channel.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ lastActivityAt: "desc" }, { createdAt: "desc" }],
        select: connectionSelect,
      }),
      this.prisma.channel.count({ where }),
      this.counts(organizationId),
    ]);
    return {
      data: rows.map((row) => this.toListItem(row)),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      counts,
    };
  }

  async counts(organizationId: string) {
    const base = { organizationId, deletedAt: null, archivedAt: null };
    const [all, connected, attention, offline] = await Promise.all([
      this.prisma.channel.count({ where: base }),
      this.prisma.channel.count({
        where: { ...base, lifecycleStatus: { in: lifecycleStatusesForGroup("CONNECTED")! } },
      }),
      this.prisma.channel.count({
        where: { ...base, lifecycleStatus: { in: lifecycleStatusesForGroup("ATTENTION")! } },
      }),
      this.prisma.channel.count({
        where: { ...base, lifecycleStatus: { in: lifecycleStatusesForGroup("OFFLINE")! } },
      }),
    ]);
    return { all, connected, attention, offline };
  }

  async create(organizationId: string, dto: CreateConnectionDto, userId: string) {
    const id = randomUUID();
    const providerName = (dto.provider || this.providers.defaultProvider()).toLowerCase();
    const provider = this.providers.get(providerName);
    const remote = await provider.create(id);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.channel.create({
        data: {
          id,
          organizationId,
          type: dto.type,
          name: dto.name.trim(),
          provider: providerName,
          externalAccountId: remote.externalInstanceId,
          lifecycleStatus: ConnectionLifecycleStatus.DRAFT,
          status: "INACTIVE",
          isActive: false,
          configurationComplete: false,
        },
        select: connectionSelect,
      });
      await this.audit(tx, organizationId, userId, "CONNECTION_CREATED", id, {
        name: created.name,
        type: created.type,
        provider: created.provider,
      });
      return this.toDetail(created);
    });
  }

  async get(organizationId: string, id: string) {
    return this.toDetail(await this.requireConnection(organizationId, id));
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateConnectionDto,
    userId: string,
  ) {
    const current = await this.requireConnection(organizationId, id);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.channel.update({
        where: { id },
        data: { ...(dto.name === undefined ? {} : { name: dto.name.trim() }) },
        select: connectionSelect,
      });
      await this.audit(tx, organizationId, userId, "CONNECTION_UPDATED", id, {
        before: { name: current.name },
        after: { name: row.name },
      });
      return row;
    });
    return this.toDetail(updated);
  }

  async connect(organizationId: string, id: string, userId: string) {
    const connection = await this.requireConnection(organizationId, id);
    if (connection.lifecycleStatus === ConnectionLifecycleStatus.CONNECTED) {
      throw new ConflictException("Connection is already connected");
    }
    const provider = this.providers.get(connection.provider);
    const qr = await provider.connect(id, this.requireExternalId(connection));
    await this.prisma.$transaction(async (tx) => {
      await tx.channel.update({
        where: { id },
        data: {
          lifecycleStatus: ConnectionLifecycleStatus.QR_PENDING,
          status: "INACTIVE",
          isActive: false,
          disconnectedAt: null,
          lastErrorAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
      await this.audit(tx, organizationId, userId, "CONNECTION_CONNECT_STARTED", id, {
        status: ConnectionLifecycleStatus.QR_PENDING,
      });
    });
    return qr;
  }

  async qr(organizationId: string, id: string) {
    const connection = await this.requireConnection(organizationId, id);
    const qr = await this.providers
      .get(connection.provider)
      .getQr(id, this.requireExternalId(connection));
    if (!qr) throw new ConflictException("QR code is unavailable or expired");
    return qr;
  }

  async reconnect(organizationId: string, id: string, userId: string) {
    const connection = await this.requireConnection(organizationId, id);
    await this.providers.get(connection.provider).disconnect(id, this.requireExternalId(connection));
    return this.connect(organizationId, id, userId);
  }

  async disconnect(organizationId: string, id: string, userId: string) {
    const connection = await this.requireConnection(organizationId, id);
    await this.providers.get(connection.provider).disconnect(id, this.requireExternalId(connection));
    const disconnectedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.channel.update({
        where: { id },
        data: {
          lifecycleStatus: ConnectionLifecycleStatus.DISCONNECTED,
          status: "DISCONNECTED",
          isActive: false,
          disconnectedAt,
        },
      });
      await this.audit(tx, organizationId, userId, "CONNECTION_DISCONNECTED", id, {
        disconnectedAt: disconnectedAt.toISOString(),
      });
    });
    return { id, status: ConnectionLifecycleStatus.DISCONNECTED, disconnectedAt };
  }

  async archive(organizationId: string, id: string, userId: string) {
    const connection = await this.requireConnection(organizationId, id);
    await this.providers.get(connection.provider).disconnect(id, this.requireExternalId(connection));
    const archivedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.pipelineChannelConnection.updateMany({
        where: { organizationId, channelId: id, deletedAt: null },
        data: { active: false, deletedAt: archivedAt },
      });
      await tx.channel.update({
        where: { id },
        data: {
          lifecycleStatus: ConnectionLifecycleStatus.ARCHIVED,
          status: "INACTIVE",
          isActive: false,
          disconnectedAt: archivedAt,
          archivedAt,
        },
      });
      await this.audit(tx, organizationId, userId, "CONNECTION_ARCHIVED", id, {
        archivedAt: archivedAt.toISOString(),
      });
    });
    return { id, status: ConnectionLifecycleStatus.ARCHIVED, archivedAt };
  }

  async updateRouting(
    organizationId: string,
    id: string,
    dto: UpdateConnectionRoutingDto,
    userId: string,
  ) {
    await this.requireConnection(organizationId, id);
    const pipelineIds = [...new Set(dto.enabledPipelineIds)];
    if (!pipelineIds.includes(dto.defaultPipelineId)) {
      throw new BadRequestException("Default pipeline must be enabled");
    }
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        id: { in: pipelineIds },
        organizationId,
        deletedAt: null,
        archived: false,
      },
      select: {
        id: true,
        stages: {
          where: { deletedAt: null, archived: false, type: "OPEN" },
          orderBy: [{ isInitial: "desc" }, { position: "asc" }],
          take: 1,
          select: { id: true },
        },
      },
    });
    if (pipelines.length !== pipelineIds.length || pipelines.some((pipeline) => !pipeline.stages[0])) {
      throw new BadRequestException("One or more enabled pipelines are invalid");
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.pipelineChannelConnection.updateMany({
        where: { organizationId, channelId: id, deletedAt: null },
        data: { active: false, isDefault: false },
      });
      for (const [priority, pipelineId] of pipelineIds.entries()) {
        const stageId = pipelines.find((pipeline) => pipeline.id === pipelineId)!.stages[0].id;
        const existing = await tx.pipelineChannelConnection.findFirst({
          where: { organizationId, channelId: id, pipelineId, deletedAt: null },
          select: { id: true },
        });
        const data = {
          active: true,
          isDefault: pipelineId === dto.defaultPipelineId,
          priority,
          defaultStageId: stageId,
        };
        if (existing) {
          await tx.pipelineChannelConnection.update({ where: { id: existing.id }, data });
        } else {
          await tx.pipelineChannelConnection.create({
            data: { organizationId, channelId: id, pipelineId, ...data },
          });
        }
      }
      await tx.channel.update({ where: { id }, data: { configurationComplete: true } });
      await this.audit(tx, organizationId, userId, "CONNECTION_ROUTING_UPDATED", id, {
        enabledPipelineIds: pipelineIds,
        defaultPipelineId: dto.defaultPipelineId,
      });
    });
    return this.get(organizationId, id);
  }

  async updateAccess(
    organizationId: string,
    id: string,
    dto: UpdateConnectionAccessDto,
    userId: string,
  ) {
    await this.requireConnection(organizationId, id);
    const teamIds = [...new Set(dto.teamIds)];
    const userIds = [...new Set(dto.userIds ?? [])];
    const [teams, users] = await Promise.all([
      this.prisma.team.count({
        where: { id: { in: teamIds }, organizationId, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { id: { in: userIds }, organizationId, deletedAt: null, status: "ACTIVE" },
      }),
    ]);
    if (teams !== teamIds.length) throw new BadRequestException("One or more teams are invalid");
    if (users !== userIds.length) throw new BadRequestException("One or more users are invalid");
    await this.prisma.$transaction(async (tx) => {
      await tx.channelTeamAccess.deleteMany({ where: { organizationId, channelId: id } });
      await tx.channelUserAccess.deleteMany({ where: { organizationId, channelId: id } });
      if (teamIds.length) {
        await tx.channelTeamAccess.createMany({
          data: teamIds.map((teamId) => ({ organizationId, channelId: id, teamId })),
        });
      }
      if (userIds.length) {
        await tx.channelUserAccess.createMany({
          data: userIds.map((accessUserId) => ({
            organizationId,
            channelId: id,
            userId: accessUserId,
          })),
        });
      }
      await tx.channel.update({
        where: { id },
        data: {
          accessMode:
            teamIds.length || userIds.length
              ? ChannelAccessMode.PIPELINE
              : ChannelAccessMode.ORGANIZATION,
        },
      });
      await this.audit(tx, organizationId, userId, "CONNECTION_ACCESS_UPDATED", id, {
        teamIds,
        userIds,
      });
    });
    return this.get(organizationId, id);
  }

  async diagnostics(organizationId: string, id: string) {
    const connection = await this.requireConnection(organizationId, id);
    return {
      id: connection.id,
      status: connection.lifecycleStatus,
      provider: connection.provider,
      configurationComplete: connection.configurationComplete,
      lastActivityAt: connection.lastActivityAt,
      lastInboundAt: connection.lastInboundAt,
      lastOutboundAt: connection.lastOutboundAt,
      lastErrorAt: connection.lastErrorAt,
      lastErrorCode: connection.lastErrorCode,
      routing: {
        enabledPipelineCount: connection.pipelineConnections.length,
        hasDefault: connection.pipelineConnections.some((route) => route.isDefault),
      },
      checks: {
        providerConfigured: Boolean(connection.provider && connection.externalAccountId),
        routingConfigured: connection.pipelineConnections.some((route) => route.isDefault),
      },
    };
  }

  async activity(organizationId: string, id: string) {
    await this.requireConnection(organizationId, id);
    const [audits, messages] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { organizationId, entityType: "Connection", entityId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, action: true, after: true, userId: true, createdAt: true },
      }),
      this.prisma.message.findMany({
        where: {
          channelId: id,
          deletedAt: null,
          conversation: { organizationId, deletedAt: null },
        },
        orderBy: { sentAt: "desc" },
        take: 50,
        select: { id: true, direction: true, status: true, body: true, sentAt: true },
      }),
    ]);
    return { data: [...audits, ...messages].sort((a, b) => {
      const left = "createdAt" in a ? a.createdAt : a.sentAt;
      const right = "createdAt" in b ? b.createdAt : b.sentAt;
      return right.getTime() - left.getTime();
    }).slice(0, 50) };
  }

  async simulateScan(organizationId: string, id: string) {
    const connection = await this.requireConnection(organizationId, id);
    const provider = this.providers.get(connection.provider);
    if (!("simulateScan" in provider) || typeof provider.simulateScan !== "function") {
      throw new BadRequestException("Provider does not support scan simulation");
    }
    const result = (provider.simulateScan as (channelId: string) => {
      status: ConnectionLifecycleStatus;
      displayAccount: string;
    })(id);
    const connectedAt = new Date();
    await this.prisma.channel.update({
      where: { id },
      data: {
        lifecycleStatus: result.status,
        displayAccount: result.displayAccount,
        connectedAt,
        disconnectedAt: null,
        isActive: true,
        status: "ACTIVE",
      },
    });
    return { ...result, connectedAt };
  }

  private toListItem(connection: SelectedConnection) {
    const defaultRoute = connection.pipelineConnections.find((route) => route.isDefault);
    return {
      id: connection.id,
      type: connection.type,
      name: connection.name,
      provider: connection.provider,
      displayAccount: connection.displayAccount,
      status: connection.lifecycleStatus,
      defaultPipeline: defaultRoute?.pipeline ?? null,
      enabledPipelineCount: connection.pipelineConnections.length,
      accessSummary:
        connection.accessMode === ChannelAccessMode.ORGANIZATION
          ? "Organização"
          : connection.teamAccesses.length
            ? connection.teamAccesses.map((entry) => entry.team.name).join(", ")
            : `${connection.userAccesses.length} usuário(s)`,
      lastActivityAt: connection.lastActivityAt,
    };
  }

  private toDetail(connection: SelectedConnection) {
    const {
      organizationId: _organizationId,
      externalAccountId: _externalAccountId,
      ...safe
    } = connection;
    return {
      ...safe,
      status: connection.lifecycleStatus,
      routing: connection.pipelineConnections,
      access: {
        mode: connection.accessMode,
        teams: connection.teamAccesses.map((entry) => entry.team),
        users: connection.userAccesses.map((entry) => entry.user),
      },
    };
  }

  private async requireConnection(
    organizationId: string,
    id: string,
    db: DbClient = this.prisma,
  ) {
    const connection = await db.channel.findFirst({
      where: { id, organizationId, deletedAt: null, archivedAt: null },
      select: connectionSelect,
    });
    if (!connection) throw new NotFoundException(`Connection ${id} not found`);
    return connection;
  }

  private requireExternalId(connection: { externalAccountId: string | null }) {
    if (!connection.externalAccountId) {
      throw new ConflictException("Connection provider instance is missing");
    }
    return connection.externalAccountId;
  }

  private async audit(
    tx: Prisma.TransactionClient,
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
    after: Prisma.InputJsonValue,
  ) {
    await tx.auditLog.create({
      data: { organizationId, userId, action, entityType: "Connection", entityId, after },
    });
  }
}
