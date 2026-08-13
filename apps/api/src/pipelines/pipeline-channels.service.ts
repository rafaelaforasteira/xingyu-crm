import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ChannelType,
  ContactType,
  PipelineDuplicateStrategy,
  PipelineRoutingMode,
  Prisma,
} from "@xingyu/database";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  ConnectPipelineChannelDto,
  SimulatePipelineLeadDto,
  UpdatePipelineChannelDto,
  UpdateChannelOwnershipDto,
} from "./dto/pipeline-channel.dto";
import { acquirePipelineChannelIdentityLock } from "./pipeline-channel-lock";
import { allocateLeadSequence } from "../common/lead-sequence";

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
  accessMode: true,
  ownerUserId: true,
  owner: { select: { id: true, name: true, avatarUrl: true, status: true } },
} satisfies Prisma.ChannelSelect;

const connectionInclude = {
  pipeline: {
    select: {
      id: true,
      name: true,
      archived: true,
      defaultOwnerId: true,
      defaultTeamId: true,
    },
  },
  channel: { select: channelPublicSelect },
  defaultStage: {
    select: { id: true, name: true, color: true, type: true, archived: true },
  },
  defaultOwner: { select: { id: true, name: true, avatarUrl: true } },
  defaultTeam: { select: { id: true, name: true } },
  campaign: { select: { id: true, name: true, status: true } },
} satisfies Prisma.PipelineChannelConnectionInclude;

const simulatedContactSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  whatsapp: true,
  email: true,
  instagram: true,
} satisfies Prisma.ContactSelect;

const simulatedConversationSelect = {
  id: true,
  contactId: true,
  channelId: true,
  assigneeId: true,
  status: true,
  lastMessageAt: true,
  unreadCount: true,
} satisfies Prisma.ConversationSelect;

const simulatedMessageSelect = {
  id: true,
  conversationId: true,
  channelId: true,
  direction: true,
  status: true,
  body: true,
  sentAt: true,
} satisfies Prisma.MessageSelect;

const simulatedDealSelect = {
  id: true,
  name: true,
  value: true,
  pipelineId: true,
  stageId: true,
  contactId: true,
  conversationId: true,
  ownerId: true,
  teamId: true,
  status: true,
} satisfies Prisma.DealSelect;

type DbClient = Prisma.TransactionClient | PrismaService;
type ConnectionWithRelations = Prisma.PipelineChannelConnectionGetPayload<{
  include: typeof connectionInclude;
}>;
type SimulatedContact = Prisma.ContactGetPayload<{
  select: typeof simulatedContactSelect;
}>;
type SimulatedConversation = Prisma.ConversationGetPayload<{
  select: typeof simulatedConversationSelect;
}>;
type SimulatedMessage = Prisma.MessageGetPayload<{
  select: typeof simulatedMessageSelect;
}>;
type SimulatedDeal = Prisma.DealGetPayload<{
  select: typeof simulatedDealSelect;
}>;
type NormalizedSimulationLead = {
  name: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  message: string;
  estimatedValue: number;
};

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

  async updateOwnership(
    organizationId: string,
    pipelineId: string,
    connectionId: string,
    dto: UpdateChannelOwnershipDto,
    userId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const connection = await this.requireConnection(organizationId, pipelineId, connectionId, tx);
      const ownerUserId = dto.accessMode === "PERSONAL" ? dto.ownerUserId : null;
      if (dto.accessMode === "PERSONAL" && !ownerUserId) {
        throw new BadRequestException("Um canal pessoal exige uma pessoa responsavel.");
      }
      if (ownerUserId) {
        const owner = await tx.user.findFirst({
          where: { id: ownerUserId, organizationId, deletedAt: null, status: "ACTIVE" },
          select: { id: true },
        });
        if (!owner) throw new BadRequestException("Responsavel invalido ou inativo.");
      }
      const before = {
        accessMode: connection.channel.accessMode,
        ownerUserId: connection.channel.ownerUserId,
      };
      const channel = await tx.channel.update({
        where: { id: connection.channelId },
        data: { accessMode: dto.accessMode, ownerUserId },
        select: channelPublicSelect,
      });
      await this.audit(
        tx,
        organizationId,
        userId,
        "UPDATE_CHANNEL_OWNERSHIP",
        connectionId,
        before,
        {
          accessMode: channel.accessMode,
          ownerUserId: channel.ownerUserId,
        },
      );
      return channel;
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

  async simulate(
    organizationId: string,
    pipelineId: string,
    connectionId: string,
    dto: SimulatePipelineLeadDto,
    userId: string,
  ) {
    this.assertDemoSimulationEnabled();
    const lead = this.normalizeSimulationLead(dto);
    const simulationId = randomUUID();

    return this.prisma.$transaction(
      async (tx) => {
        const connection = await this.requireConnection(
          organizationId,
          pipelineId,
          connectionId,
          tx,
        );
        if (!connection.active) {
          throw new ConflictException("Paused connections cannot receive simulated leads");
        }
        if (connection.pipeline.archived) {
          throw new ConflictException("Archived pipelines cannot receive simulated leads");
        }
        const channel = await this.requireUsableChannel(organizationId, connection.channelId, tx);
        await this.requireOrganizationUser(organizationId, userId, tx);

        if (!connection.defaultStageId) {
          throw new ConflictException("Connection has no default stage");
        }
        const stage = await tx.pipelineStage.findFirst({
          where: {
            id: connection.defaultStageId,
            organizationId,
            pipelineId,
            deletedAt: null,
            archived: false,
            type: "OPEN",
          },
          select: { id: true, name: true },
        });
        if (!stage) {
          throw new ConflictException(
            "Connection default stage must be an active OPEN stage in this pipeline",
          );
        }

        const { ownerId, teamId } = await this.resolveSimulationRouting(
          organizationId,
          connection,
          tx,
        );
        const defaultTagIds = this.jsonStringArray(connection.defaultTagIds);
        const tags = defaultTagIds.length
          ? await tx.tag.findMany({
              where: {
                id: { in: defaultTagIds },
                organizationId,
                deletedAt: null,
                entityType: { in: ["CONTACT", "DEAL"] },
              },
              select: { id: true, entityType: true },
            })
          : [];
        if (tags.length !== defaultTagIds.length) {
          throw new ConflictException("Connection contains missing or unsupported default tags");
        }
        const campaign = connection.campaignId
          ? await tx.campaign.findFirst({
              where: {
                id: connection.campaignId,
                organizationId,
                deletedAt: null,
              },
              select: { id: true, name: true },
            })
          : null;
        if (connection.campaignId && !campaign) {
          throw new ConflictException("Connection campaign is no longer active");
        }

        if (connection.duplicateStrategy !== "CREATE_NEW") {
          await this.lockContactIdentities(tx, organizationId, lead);
        }
        const identityFilters = this.contactIdentityFilters(lead);
        const matches = identityFilters.length
          ? await tx.contact.findMany({
              where: {
                organizationId,
                deletedAt: null,
                OR: identityFilters,
              },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              take: 3,
              select: simulatedContactSelect,
            })
          : [];

        if (connection.duplicateStrategy === "REJECT" && matches.length) {
          throw new ConflictException(
            "A contact with the supplied phone, email, or Instagram already exists",
          );
        }
        if (connection.duplicateStrategy === "MERGE" && matches.length > 1) {
          throw new ConflictException(
            "The supplied identifiers match multiple contacts; merge is ambiguous",
          );
        }

        const matchedContact = matches[0] ?? null;
        let contact: SimulatedContact | null =
          connection.duplicateStrategy === "MERGE" ? matchedContact : null;
        let contactCreated = false;
        const simulatedAt = new Date();
        if (!contact && connection.createContact) {
          contact = await tx.contact.create({
            data: {
              organizationId,
              firstName: lead.firstName,
              lastName: lead.lastName,
              phone: lead.phone,
              whatsapp: channel.type === "WHATSAPP" ? lead.phone : null,
              email: lead.email,
              instagram: lead.instagram,
              type: this.contactTypeForChannel(channel.type),
              status: "LEAD",
              source: connection.source ?? channel.displayName ?? channel.name ?? channel.type,
              campaign: campaign?.name ?? null,
              ownerId,
              teamId,
              firstInteractionAt: simulatedAt,
              createdById: userId,
              updatedById: userId,
            },
            select: simulatedContactSelect,
          });
          contactCreated = true;
        }

        let conversation: SimulatedConversation | null = null;
        let message: SimulatedMessage | null = null;
        if (connection.createConversation) {
          conversation = await tx.conversation.create({
            data: {
              organizationId,
              contactId: contact?.id ?? null,
              channelId: channel.id,
              assigneeId: ownerId,
              subject: `Lead DEMO — ${lead.name}`,
              status: "OPEN",
              lastMessageAt: simulatedAt,
              unreadCount: 1,
              createdById: userId,
              updatedById: userId,
            },
            select: simulatedConversationSelect,
          });
          message = await tx.message.create({
            data: {
              conversationId: conversation.id,
              channelId: channel.id,
              senderId: null,
              direction: "INBOUND",
              status: "DELIVERED",
              body: lead.message,
              isInternal: false,
              metadata: {
                demoMode: true,
                simulationId,
                pipelineChannelConnectionId: connection.id,
                contentType: "text",
              },
              sentAt: simulatedAt,
            },
            select: simulatedMessageSelect,
          });
        }

        let deal: SimulatedDeal | null = null;
        if (connection.createDeal) {
          const leadSequence = await allocateLeadSequence(tx, organizationId);
          deal = await tx.deal.create({
            data: {
              organizationId,
              pipelineId,
              stageId: stage.id,
              contactId: contact?.id ?? null,
              ownerId,
              teamId,
              conversationId: conversation?.id ?? null,
              name: `Oportunidade — ${lead.name}`,
              leadSequence,
              value: lead.estimatedValue,
              status: "OPEN",
              source: connection.source ?? channel.displayName ?? channel.name ?? channel.type,
              campaign: campaign?.name ?? null,
              enteredStageAt: simulatedAt,
              lastInteractionAt: simulatedAt,
              unreadMessages: message ? 1 : 0,
              createdById: userId,
              updatedById: userId,
            },
            select: simulatedDealSelect,
          });
          await tx.dealStageHistory.create({
            data: {
              dealId: deal.id,
              stageId: stage.id,
              fromStageId: null,
              movedById: userId,
              movedAt: simulatedAt,
              note: `DEMO simulation ${simulationId}`,
            },
          });
        }

        const contactTagIds = contact
          ? tags.filter((tag) => tag.entityType === "CONTACT").map((tag) => tag.id)
          : [];
        const dealTagIds = deal
          ? tags.filter((tag) => tag.entityType === "DEAL").map((tag) => tag.id)
          : [];
        if (contact && contactTagIds.length) {
          await tx.contactTag.createMany({
            data: contactTagIds.map((tagId) => ({ contactId: contact!.id, tagId })),
            skipDuplicates: true,
          });
        }
        if (deal && dealTagIds.length) {
          await tx.dealTag.createMany({
            data: dealTagIds.map((tagId) => ({ dealId: deal!.id, tagId })),
            skipDuplicates: true,
          });
        }
        const appliedTagIds = [...contactTagIds, ...dealTagIds];

        await tx.activity.create({
          data: {
            organizationId,
            type: "MESSAGE_RECEIVED",
            title: `Lead received via ${channel.displayName ?? channel.name}`,
            description: lead.message.slice(0, 500),
            actorId: userId,
            contactId: contact?.id ?? null,
            dealId: deal?.id ?? null,
            conversationId: conversation?.id ?? null,
            metadata: {
              demoMode: true,
              simulationId,
              pipelineChannelConnectionId: connection.id,
              channelId: channel.id,
              duplicateStrategy: connection.duplicateStrategy,
              matchedContactId: matchedContact?.id ?? null,
              contactCreated,
              messageId: message?.id ?? null,
              appliedTagIds,
            },
          },
        });
        await tx.channel.update({
          where: { id: channel.id },
          data: {
            lastSyncAt: simulatedAt,
            lastErrorAt: null,
            lastErrorMessage: null,
          },
        });
        await this.audit(
          tx,
          organizationId,
          userId,
          "SIMULATE_PIPELINE_CHANNEL",
          connection.id,
          this.snapshot(connection),
          {
            mode: "DEMO",
            simulationId,
            simulatedAt: simulatedAt.toISOString(),
            matchedContactId: matchedContact?.id ?? null,
            contactCreated,
            contactId: contact?.id ?? null,
            conversationId: conversation?.id ?? null,
            messageId: message?.id ?? null,
            dealId: deal?.id ?? null,
            appliedTagIds,
          },
        );

        return {
          ok: true,
          mode: "DEMO" as const,
          simulationId,
          simulatedAt,
          connectionId: connection.id,
          duplicateStrategy: connection.duplicateStrategy,
          matchedContactId: matchedContact?.id ?? null,
          contactCreated,
          contactReused: Boolean(contact && matchedContact && contact.id === matchedContact.id),
          contact,
          conversation,
          message,
          deal: deal ? { ...deal, value: Number(deal.value) } : null,
          appliedTagIds,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
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

  private assertDemoSimulationEnabled() {
    const configured = process.env.DEMO_MODE?.trim().toLowerCase();
    const explicitlyEnabled = ["true", "1", "yes", "on"].includes(configured ?? "");
    const enabledByEnvironment = configured === undefined && process.env.NODE_ENV !== "production";
    if (!explicitlyEnabled && !enabledByEnvironment) {
      throw new ForbiddenException(
        "Pipeline lead simulation is available only when DEMO_MODE is enabled",
      );
    }
  }

  private normalizeSimulationLead(dto: SimulatePipelineLeadDto): NormalizedSimulationLead {
    const name = dto.name.trim().replace(/\s+/g, " ");
    const message = dto.message.trim();
    if (!name) throw new BadRequestException("Name cannot be empty");
    if (!message) throw new BadRequestException("Message cannot be empty");

    const phone = dto.phone ? this.normalizePhone(dto.phone) : null;
    if (dto.phone && !phone) {
      throw new BadRequestException("Phone must contain 8 to 15 digits");
    }
    const email = dto.email?.trim().toLowerCase() || null;
    const instagram = dto.instagram ? this.normalizeInstagram(dto.instagram) : null;
    if (dto.instagram && !instagram) {
      throw new BadRequestException("Instagram handle is invalid");
    }
    const estimatedValue = dto.estimatedValue ?? 0;
    if (
      !Number.isFinite(estimatedValue) ||
      estimatedValue < 0 ||
      estimatedValue > 999999999999.99 ||
      Math.abs(Math.round(estimatedValue * 100) - estimatedValue * 100) > 1e-8
    ) {
      throw new BadRequestException(
        "Estimated value must be non-negative and have at most two decimals",
      );
    }

    const [firstName, ...lastNameParts] = name.split(" ");
    return {
      name,
      firstName,
      lastName: lastNameParts.join(" ") || null,
      phone,
      email,
      instagram,
      message,
      estimatedValue,
    };
  }

  private normalizePhone(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return null;
    if (digits.length <= 11) return `+55${digits}`;
    return `+${digits}`;
  }

  private normalizeInstagram(value: string) {
    const withoutUrl = value
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/(?:www\.)?instagram\.com\//, "");
    const handle = withoutUrl.split(/[/?#]/, 1)[0]?.replace(/^@/, "").replace(/\s+/g, "");
    return handle ? `@${handle}` : null;
  }

  private contactIdentityFilters(lead: NormalizedSimulationLead): Prisma.ContactWhereInput[] {
    const filters: Prisma.ContactWhereInput[] = [];
    if (lead.phone) {
      filters.push({
        OR: [{ phone: lead.phone }, { whatsapp: lead.phone }],
      });
    }
    if (lead.email) {
      filters.push({
        email: { equals: lead.email, mode: "insensitive" },
      });
    }
    if (lead.instagram) {
      filters.push({
        instagram: { equals: lead.instagram, mode: "insensitive" },
      });
    }
    return filters;
  }

  private async lockContactIdentities(
    tx: Prisma.TransactionClient,
    organizationId: string,
    lead: NormalizedSimulationLead,
  ) {
    const identities = [
      lead.phone ? `phone:${lead.phone}` : null,
      lead.email ? `email:${lead.email}` : null,
      lead.instagram ? `instagram:${lead.instagram}` : null,
    ]
      .filter((identity): identity is string => Boolean(identity))
      .sort();

    for (const identity of identities) {
      const lockKey = `${organizationId}:${identity}`;
      await acquirePipelineChannelIdentityLock(tx, lockKey);
    }
  }

  private async requireOrganizationUser(organizationId: string, userId: string, db: DbClient) {
    const user = await db.user.findFirst({
      where: {
        id: userId,
        organizationId,
        deletedAt: null,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(`User ${userId} is not active in this organization`);
    }
    return user;
  }

  private async resolveSimulationRouting(
    organizationId: string,
    connection: ConnectionWithRelations,
    db: DbClient,
  ) {
    const teamId = connection.defaultTeamId ?? connection.pipeline.defaultTeamId ?? null;
    if (teamId) {
      const team = await db.team.findFirst({
        where: { id: teamId, organizationId, deletedAt: null },
        select: { id: true },
      });
      if (!team) {
        throw new ConflictException("Connection routing team is no longer active");
      }
    }

    let ownerId = connection.defaultOwnerId ?? connection.pipeline.defaultOwnerId ?? null;
    if (connection.routingMode === "ROUND_ROBIN" && teamId) {
      const roundRobinOwner = await db.user.findFirst({
        where: {
          organizationId,
          teamId,
          deletedAt: null,
          status: "ACTIVE",
        },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      ownerId = roundRobinOwner?.id ?? ownerId;
    }
    if (ownerId) {
      const owner = await db.user.findFirst({
        where: {
          id: ownerId,
          organizationId,
          deletedAt: null,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!owner) {
        throw new ConflictException("Connection routing owner is no longer active");
      }
    }
    if (connection.routingMode === "FIXED" && !ownerId) {
      throw new ConflictException("FIXED routing requires an active owner");
    }
    if (connection.routingMode === "ROUND_ROBIN" && teamId && !ownerId) {
      throw new ConflictException("ROUND_ROBIN routing requires an active team member");
    }
    return { ownerId, teamId };
  }

  private contactTypeForChannel(type: ChannelType): ContactType {
    if (type === "WHATSAPP") return "WHATSAPP";
    if (type === "INSTAGRAM") return "INSTAGRAM";
    if (type === "SITE_CHAT" || type === "WEB_CHAT" || type === "SHOPIFY" || type === "FORM") {
      return "SITE_CUSTOMER";
    }
    return "OTHER";
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
        select: { id: true, type: true },
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
            select: { id: true, entityType: true },
          })
        : Promise.resolve([]),
    ]);

    if (!stage) throw new BadRequestException("Default stage is invalid");
    if (stage.type !== "OPEN") {
      throw new BadRequestException("Default stage must be an OPEN stage");
    }
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
    if (tags.some((tag) => tag.entityType !== "CONTACT" && tag.entityType !== "DEAL")) {
      throw new BadRequestException("Pipeline channel tags must target CONTACT or DEAL");
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
