import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PipelineDuplicateStrategy, PipelineRoutingMode, Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { ConnectPipelineChannelDto, UpdatePipelineChannelDto } from "./dto/pipeline-channel.dto";

const channelPublicSelect = {
  id: true,
  type: true,
  name: true,
  provider: true,
  externalAccountId: true,
  displayName: true,
  status: true,
  isActive: true,
  lastSyncAt: true,
  lastErrorAt: true,
  lastErrorMessage: true,
} satisfies Prisma.ChannelSelect;

const connectionInclude = {
  pipeline: { select: { id: true, name: true } },
  channel: { select: channelPublicSelect },
  defaultStage: {
    select: { id: true, name: true, color: true, type: true, archived: true },
  },
  defaultOwner: { select: { id: true, name: true, avatarUrl: true } },
  defaultTeam: { select: { id: true, name: true } },
  campaign: { select: { id: true, name: true, status: true } },
} satisfies Prisma.PipelineChannelConnectionInclude;

type DbClient = Prisma.TransactionClient | PrismaService;
type ConnectionWithRelations = Prisma.PipelineChannelConnectionGetPayload<{
  include: typeof connectionInclude;
}>;

@Injectable()
export class PipelineChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async available(organizationId: string, pipelineId: string) {
    await this.requirePipeline(organizationId, pipelineId);

    const [channels, connections] = await Promise.all([
      this.prisma.channel.findMany({
        where: { organizationId, deletedAt: null },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: channelPublicSelect,
      }),
      this.prisma.pipelineChannelConnection.findMany({
        where: { organizationId, pipelineId, deletedAt: null },
        select: { id: true, channelId: true, active: true },
      }),
    ]);
    const byChannel = new Map(connections.map((connection) => [connection.channelId, connection]));

    return {
      data: channels.map((channel) => {
        const connection = byChannel.get(channel.id);
        return {
          ...channel,
          provider: channel.provider ?? channel.type,
          displayName: channel.displayName ?? channel.name,
          connected: Boolean(connection),
          connectionId: connection?.id ?? null,
          connectionActive: connection?.active ?? false,
        };
      }),
    };
  }

  async list(organizationId: string, pipelineId: string) {
    await this.requirePipeline(organizationId, pipelineId);
    const connections = await this.prisma.pipelineChannelConnection.findMany({
      where: { organizationId, pipelineId, deletedAt: null },
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      include: connectionInclude,
    });

    return { data: await this.attachDefaultTags(organizationId, connections) };
  }

  async connect(
    organizationId: string,
    pipelineId: string,
    dto: ConnectPipelineChannelDto,
    userId: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.requirePipeline(organizationId, pipelineId, tx);
        await this.requireUsableChannel(organizationId, dto.channelId, tx);
        await this.ensureNotConnected(organizationId, pipelineId, dto.channelId, tx);
        await this.validateReferences(
          organizationId,
          pipelineId,
          {
            defaultStageId: dto.defaultStageId,
            defaultOwnerId: dto.defaultOwnerId,
            defaultTeamId: dto.defaultTeamId,
            defaultTagIds: dto.defaultTagIds ?? [],
            campaignId: dto.campaignId,
            routingMode: dto.routingMode ?? "PIPELINE_DEFAULTS",
          },
          tx,
        );

        const connection = await tx.pipelineChannelConnection.create({
          data: {
            organizationId,
            pipelineId,
            channelId: dto.channelId,
            defaultStageId: dto.defaultStageId,
            defaultOwnerId: dto.defaultOwnerId ?? null,
            defaultTeamId: dto.defaultTeamId ?? null,
            defaultTagIds: dto.defaultTagIds ?? [],
            source: this.optionalText(dto.source),
            campaignId: dto.campaignId ?? null,
            active: dto.active ?? true,
            createContact: dto.createContact ?? true,
            createConversation: dto.createConversation ?? true,
            createDeal: dto.createDeal ?? true,
            duplicateStrategy:
              (dto.duplicateStrategy as PipelineDuplicateStrategy | undefined) ?? "MERGE",
            routingMode:
              (dto.routingMode as PipelineRoutingMode | undefined) ?? "PIPELINE_DEFAULTS",
          },
        });
        await this.audit(
          tx,
          organizationId,
          userId,
          "CONNECT_PIPELINE_CHANNEL",
          connection.id,
          null,
          this.snapshot(connection),
        );
        const result = await this.requireConnection(organizationId, pipelineId, connection.id, tx);
        return this.attachDefaultTags(organizationId, [result], tx).then(([item]) => item);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("This channel is already connected to the pipeline");
      }
      throw error;
    }
  }

  async update(
    organizationId: string,
    pipelineId: string,
    connectionId: string,
    dto: UpdatePipelineChannelDto,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.requireConnection(organizationId, pipelineId, connectionId, tx);
      if (Object.prototype.hasOwnProperty.call(dto, "defaultStageId") && !dto.defaultStageId) {
        throw new BadRequestException("A default stage is required");
      }
      if (dto.active === true) {
        await this.requireUsableChannel(organizationId, existing.channelId, tx);
      }
      const defaultOwnerId = this.valueOrCurrent(dto, "defaultOwnerId", existing.defaultOwnerId);
      const defaultTeamId = this.valueOrCurrent(dto, "defaultTeamId", existing.defaultTeamId);
      const campaignId = this.valueOrCurrent(dto, "campaignId", existing.campaignId);
      const defaultTagIds = dto.defaultTagIds ?? this.jsonStringArray(existing.defaultTagIds);
      const routingMode = (dto.routingMode ?? existing.routingMode) as PipelineRoutingMode;
      const defaultStageId = dto.defaultStageId ?? existing.defaultStageId;

      if (!defaultStageId) {
        throw new BadRequestException("A default stage is required");
      }
      await this.validateReferences(
        organizationId,
        pipelineId,
        {
          defaultStageId,
          defaultOwnerId,
          defaultTeamId,
          defaultTagIds,
          campaignId,
          routingMode,
        },
        tx,
      );

      const data: Prisma.PipelineChannelConnectionUncheckedUpdateInput = {
        ...(dto.defaultStageId === undefined ? {} : { defaultStageId: dto.defaultStageId }),
        ...(dto.defaultOwnerId === undefined ? {} : { defaultOwnerId: dto.defaultOwnerId }),
        ...(dto.defaultTeamId === undefined ? {} : { defaultTeamId: dto.defaultTeamId }),
        ...(dto.defaultTagIds === undefined ? {} : { defaultTagIds: dto.defaultTagIds }),
        ...(dto.source === undefined ? {} : { source: this.optionalText(dto.source) }),
        ...(dto.campaignId === undefined ? {} : { campaignId: dto.campaignId }),
        ...(dto.active === undefined ? {} : { active: dto.active }),
        ...(dto.createContact === undefined ? {} : { createContact: dto.createContact }),
        ...(dto.createConversation === undefined
          ? {}
          : { createConversation: dto.createConversation }),
        ...(dto.createDeal === undefined ? {} : { createDeal: dto.createDeal }),
        ...(dto.duplicateStrategy === undefined
          ? {}
          : {
              duplicateStrategy: dto.duplicateStrategy as PipelineDuplicateStrategy,
            }),
        ...(dto.routingMode === undefined
          ? {}
          : { routingMode: dto.routingMode as PipelineRoutingMode }),
      };
      const updated = await tx.pipelineChannelConnection.update({
        where: { id: connectionId },
        data,
      });
      await this.audit(
        tx,
        organizationId,
        userId,
        "UPDATE_PIPELINE_CHANNEL",
        connectionId,
        this.snapshot(existing),
        this.snapshot(updated),
      );
      const result = await this.requireConnection(organizationId, pipelineId, connectionId, tx);
      return this.attachDefaultTags(organizationId, [result], tx).then(([item]) => item);
    });
  }

  pause(organizationId: string, pipelineId: string, connectionId: string, userId: string) {
    return this.setActive(organizationId, pipelineId, connectionId, false, userId);
  }

  resume(organizationId: string, pipelineId: string, connectionId: string, userId: string) {
    return this.setActive(organizationId, pipelineId, connectionId, true, userId);
  }

  async test(organizationId: string, pipelineId: string, connectionId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const connection = await this.requireConnection(organizationId, pipelineId, connectionId, tx);
      if (!connection.active) {
        throw new ConflictException("Paused connections cannot be tested");
      }
      this.assertChannelUsable(connection.channel);

      // DEMO is intentionally deterministic and never calls an external provider.
      const testedAt = new Date();
      await tx.channel.update({
        where: { id: connection.channelId },
        data: {
          lastSyncAt: testedAt,
          lastErrorAt: null,
          lastErrorMessage: null,
        },
      });
      await this.audit(
        tx,
        organizationId,
        userId,
        "TEST_PIPELINE_CHANNEL",
        connectionId,
        this.snapshot(connection),
        { mode: "DEMO", testedAt: testedAt.toISOString(), ok: true },
      );

      return {
        ok: true,
        mode: "DEMO" as const,
        testedAt,
        connectionId,
        channel: {
          id: connection.channel.id,
          type: connection.channel.type,
          name: connection.channel.name,
          status: connection.channel.status,
        },
      };
    });
  }

  async disconnect(
    organizationId: string,
    pipelineId: string,
    connectionId: string,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.requireConnection(organizationId, pipelineId, connectionId, tx);
      const disconnectedAt = new Date();
      const updated = await tx.pipelineChannelConnection.update({
        where: { id: connectionId },
        data: { active: false, deletedAt: disconnectedAt },
      });
      await this.audit(
        tx,
        organizationId,
        userId,
        "DISCONNECT_PIPELINE_CHANNEL",
        connectionId,
        this.snapshot(existing),
        this.snapshot(updated),
      );
      return { id: connectionId, disconnected: true, disconnectedAt };
    });
  }

  private async setActive(
    organizationId: string,
    pipelineId: string,
    connectionId: string,
    active: boolean,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await this.requireConnection(organizationId, pipelineId, connectionId, tx);
      if (active) this.assertChannelUsable(existing.channel);
      if (existing.active === active) {
        return this.attachDefaultTags(organizationId, [existing], tx).then(([item]) => item);
      }

      const updated = await tx.pipelineChannelConnection.update({
        where: { id: connectionId },
        data: { active },
      });
      await this.audit(
        tx,
        organizationId,
        userId,
        active ? "RESUME_PIPELINE_CHANNEL" : "PAUSE_PIPELINE_CHANNEL",
        connectionId,
        this.snapshot(existing),
        this.snapshot(updated),
      );
      const result = await this.requireConnection(organizationId, pipelineId, connectionId, tx);
      return this.attachDefaultTags(organizationId, [result], tx).then(([item]) => item);
    });
  }

  private async requirePipeline(
    organizationId: string,
    pipelineId: string,
    db: DbClient = this.prisma,
  ) {
    const pipeline = await db.pipeline.findFirst({
      where: { id: pipelineId, organizationId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!pipeline) {
      throw new NotFoundException(`Pipeline ${pipelineId} not found`);
    }
    return pipeline;
  }

  private async requireUsableChannel(organizationId: string, channelId: string, db: DbClient) {
    const channel = await db.channel.findFirst({
      where: { id: channelId, organizationId, deletedAt: null },
      select: channelPublicSelect,
    });
    if (!channel) throw new BadRequestException("Channel is invalid");
    this.assertChannelUsable(channel);
    return channel;
  }

  private assertChannelUsable(channel: { isActive: boolean; status: string }) {
    if (
      !channel.isActive ||
      ["DISCONNECTED", "INACTIVE", "ERROR"].includes(channel.status.toUpperCase())
    ) {
      throw new ConflictException("Channel account is not active");
    }
  }

  private async ensureNotConnected(
    organizationId: string,
    pipelineId: string,
    channelId: string,
    db: DbClient,
  ) {
    const existing = await db.pipelineChannelConnection.findFirst({
      where: { organizationId, pipelineId, channelId, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException("This channel is already connected to the pipeline");
    }
  }

  private async requireConnection(
    organizationId: string,
    pipelineId: string,
    connectionId: string,
    db: DbClient = this.prisma,
  ) {
    const connection = await db.pipelineChannelConnection.findFirst({
      where: {
        id: connectionId,
        organizationId,
        pipelineId,
        deletedAt: null,
        pipeline: { organizationId, deletedAt: null },
      },
      include: connectionInclude,
    });
    if (!connection) {
      throw new NotFoundException(`Pipeline channel ${connectionId} not found`);
    }
    return connection;
  }

  private async validateReferences(
    organizationId: string,
    pipelineId: string,
    values: {
      defaultStageId: string;
      defaultOwnerId?: string | null;
      defaultTeamId?: string | null;
      defaultTagIds: string[];
      campaignId?: string | null;
      routingMode: PipelineRoutingMode | string;
    },
    db: DbClient,
  ) {
    const [stage, owner, team, campaign, tags] = await Promise.all([
      db.pipelineStage.findFirst({
        where: {
          id: values.defaultStageId,
          organizationId,
          pipelineId,
          deletedAt: null,
          archived: false,
        },
        select: { id: true },
      }),
      values.defaultOwnerId
        ? db.user.findFirst({
            where: {
              id: values.defaultOwnerId,
              organizationId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      values.defaultTeamId
        ? db.team.findFirst({
            where: {
              id: values.defaultTeamId,
              organizationId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      values.campaignId
        ? db.campaign.findFirst({
            where: {
              id: values.campaignId,
              organizationId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      values.defaultTagIds.length
        ? db.tag.findMany({
            where: {
              id: { in: [...new Set(values.defaultTagIds)] },
              organizationId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    if (!stage) throw new BadRequestException("Default stage is invalid");
    if (values.defaultOwnerId && !owner) {
      throw new BadRequestException("Default owner is invalid");
    }
    if (values.defaultTeamId && !team) {
      throw new BadRequestException("Default team is invalid");
    }
    if (values.campaignId && !campaign) {
      throw new BadRequestException("Campaign is invalid");
    }
    if (tags.length !== new Set(values.defaultTagIds).size) {
      throw new BadRequestException("One or more default tags are invalid");
    }
    if (values.routingMode === "FIXED" && !values.defaultOwnerId) {
      throw new BadRequestException("A default owner is required for FIXED routing");
    }
  }

  private async attachDefaultTags(
    organizationId: string,
    connections: ConnectionWithRelations[],
    db: DbClient = this.prisma,
  ) {
    const ids = [
      ...new Set(
        connections.flatMap((connection) => this.jsonStringArray(connection.defaultTagIds)),
      ),
    ];
    const tags = ids.length
      ? await db.tag.findMany({
          where: { id: { in: ids }, organizationId, deletedAt: null },
          select: { id: true, name: true, color: true, entityType: true },
        })
      : [];
    const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

    return connections.map((connection) => ({
      ...connection,
      defaultTags: this.jsonStringArray(connection.defaultTagIds)
        .map((id) => tagsById.get(id))
        .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag)),
    }));
  }

  private jsonStringArray(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
  }

  private valueOrCurrent<
    T extends UpdatePipelineChannelDto,
    K extends "defaultOwnerId" | "defaultTeamId" | "campaignId",
  >(dto: T, key: K, current: string | null) {
    return Object.prototype.hasOwnProperty.call(dto, key)
      ? ((dto[key] as string | null | undefined) ?? null)
      : current;
  }

  private optionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private snapshot(connection: {
    pipelineId: string;
    channelId: string;
    defaultStageId: string | null;
    defaultOwnerId: string | null;
    defaultTeamId: string | null;
    defaultTagIds: Prisma.JsonValue;
    source: string | null;
    campaignId: string | null;
    active: boolean;
    createContact: boolean;
    createConversation: boolean;
    createDeal: boolean;
    duplicateStrategy: PipelineDuplicateStrategy;
    routingMode: PipelineRoutingMode;
    deletedAt: Date | null;
  }): Prisma.InputJsonObject {
    return {
      pipelineId: connection.pipelineId,
      channelId: connection.channelId,
      defaultStageId: connection.defaultStageId,
      defaultOwnerId: connection.defaultOwnerId,
      defaultTeamId: connection.defaultTeamId,
      defaultTagIds: connection.defaultTagIds,
      source: connection.source,
      campaignId: connection.campaignId,
      active: connection.active,
      createContact: connection.createContact,
      createConversation: connection.createConversation,
      createDeal: connection.createDeal,
      duplicateStrategy: connection.duplicateStrategy,
      routingMode: connection.routingMode,
      deletedAt: connection.deletedAt?.toISOString() ?? null,
    };
  }

  private async audit(
    tx: Prisma.TransactionClient,
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
    before: Prisma.InputJsonValue | null,
    after: Prisma.InputJsonValue | null,
  ) {
    await tx.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "PipelineChannelConnection",
        entityId,
        before: before ?? Prisma.JsonNull,
        after: after ?? Prisma.JsonNull,
      },
    });
  }
}
