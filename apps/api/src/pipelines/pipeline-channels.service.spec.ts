import { BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PipelineChannelsService } from "./pipeline-channels.service";

type MockMethod = jest.Mock<Promise<unknown>, unknown[]>;

type PrismaMock = {
  pipeline: { findFirst: MockMethod };
  channel: {
    findFirst: MockMethod;
    findMany: MockMethod;
    update: MockMethod;
  };
  pipelineChannelConnection: {
    findFirst: MockMethod;
    findMany: MockMethod;
    create: MockMethod;
    update: MockMethod;
  };
  pipelineStage: { findFirst: MockMethod };
  user: { findFirst: MockMethod };
  team: { findFirst: MockMethod };
  campaign: { findFirst: MockMethod };
  tag: { findMany: MockMethod };
  contact: { findMany: MockMethod; create: MockMethod };
  conversation: { create: MockMethod };
  message: { create: MockMethod };
  deal: { create: MockMethod };
  dealStageHistory: { create: MockMethod };
  contactTag: { createMany: MockMethod };
  dealTag: { createMany: MockMethod };
  activity: { create: MockMethod };
  auditLog: { create: MockMethod };
  $queryRaw: MockMethod;
  $transaction: jest.Mock<
    Promise<unknown>,
    [(tx: PrismaMock) => Promise<unknown>, { isolationLevel?: string }?]
  >;
};

const organizationId = "org-test";
const pipelineId = "pipeline-test";
const connectionId = "connection-test";
const channelId = "channel-test";
const stageId = "stage-test";
const userId = "user-test";
const fixedDate = new Date("2026-07-30T12:00:00.000Z");

function method(): MockMethod {
  return jest.fn();
}

function createPrismaMock(): PrismaMock {
  const prisma: PrismaMock = {
    pipeline: { findFirst: method() },
    channel: {
      findFirst: method(),
      findMany: method(),
      update: method(),
    },
    pipelineChannelConnection: {
      findFirst: method(),
      findMany: method(),
      create: method(),
      update: method(),
    },
    pipelineStage: { findFirst: method() },
    user: { findFirst: method() },
    team: { findFirst: method() },
    campaign: { findFirst: method() },
    tag: { findMany: method() },
    contact: { findMany: method(), create: method() },
    conversation: { create: method() },
    message: { create: method() },
    deal: { create: method() },
    dealStageHistory: { create: method() },
    contactTag: { createMany: method() },
    dealTag: { createMany: method() },
    activity: { create: method() },
    auditLog: { create: method() },
    $queryRaw: method(),
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  return prisma;
}

function channel(overrides: Partial<{ isActive: boolean; status: string }> = {}) {
  return {
    id: channelId,
    type: "WHATSAPP" as const,
    name: "WhatsApp Xingyu",
    provider: null,
    externalAccountId: null,
    displayName: null,
    status: overrides.status ?? "ACTIVE",
    isActive: overrides.isActive ?? true,
    lastSyncAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
  };
}

function connection(
  overrides: Partial<{
    active: boolean;
    defaultStageId: string | null;
    defaultOwnerId: string | null;
    defaultTeamId: string | null;
    defaultTagIds: string[];
    createContact: boolean;
    createConversation: boolean;
    createDeal: boolean;
    duplicateStrategy: "MERGE" | "CREATE_NEW" | "REJECT";
    routingMode: "PIPELINE_DEFAULTS" | "FIXED" | "ROUND_ROBIN";
  }> = {},
) {
  return {
    id: connectionId,
    organizationId,
    pipelineId,
    channelId,
    defaultStageId: overrides.defaultStageId === undefined ? stageId : overrides.defaultStageId,
    defaultOwnerId: overrides.defaultOwnerId ?? null,
    defaultTeamId: overrides.defaultTeamId ?? null,
    defaultTagIds: overrides.defaultTagIds ?? [],
    source: "WhatsApp",
    campaignId: null,
    active: overrides.active ?? true,
    createContact: overrides.createContact ?? true,
    createConversation: overrides.createConversation ?? true,
    createDeal: overrides.createDeal ?? true,
    duplicateStrategy: overrides.duplicateStrategy ?? ("MERGE" as const),
    routingMode: overrides.routingMode ?? ("PIPELINE_DEFAULTS" as const),
    createdAt: fixedDate,
    updatedAt: fixedDate,
    deletedAt: null,
    pipeline: {
      id: pipelineId,
      name: "Novos leads",
      archived: false,
      defaultOwnerId: null,
      defaultTeamId: null,
    },
    channel: channel(),
    defaultStage: {
      id: stageId,
      name: "Entrada",
      color: "#A78BFA",
      type: "OPEN" as const,
      archived: false,
    },
    defaultOwner: null,
    defaultTeam: null,
    campaign: null,
  };
}

function simulatedContact(id = "contact-simulated") {
  return {
    id,
    firstName: "Marina",
    lastName: "Oliveira",
    phone: "+5511999990000",
    whatsapp: "+5511999990000",
    email: "marina@example.com",
    instagram: "@marina",
  };
}

function simulatedConversation() {
  return {
    id: "conversation-simulated",
    contactId: "contact-simulated",
    channelId,
    assigneeId: null,
    status: "OPEN" as const,
    lastMessageAt: fixedDate,
    unreadCount: 1,
  };
}

function simulatedMessage() {
  return {
    id: "message-simulated",
    conversationId: "conversation-simulated",
    channelId,
    direction: "INBOUND" as const,
    status: "DELIVERED" as const,
    body: "Quero receber o catálogo",
    sentAt: fixedDate,
  };
}

function simulatedDeal() {
  return {
    id: "deal-simulated",
    name: "Oportunidade — Marina Oliveira",
    value: 0.29,
    pipelineId,
    stageId,
    contactId: "contact-simulated",
    conversationId: "conversation-simulated",
    ownerId: null,
    teamId: null,
    status: "OPEN" as const,
  };
}

function prepareSimulation(prisma: PrismaMock, configuredConnection = connection()) {
  prisma.pipelineChannelConnection.findFirst.mockResolvedValue(configuredConnection);
  prisma.channel.findFirst.mockResolvedValue(channel());
  prisma.user.findFirst.mockResolvedValue({ id: userId });
  prisma.pipelineStage.findFirst.mockResolvedValue({
    id: stageId,
    name: "Entrada",
    type: "OPEN",
  });
  prisma.$queryRaw.mockResolvedValue([{ seq: 42 }]);
  prisma.contact.findMany.mockResolvedValue([]);
  prisma.contact.create.mockResolvedValue(simulatedContact());
  prisma.conversation.create.mockResolvedValue(simulatedConversation());
  prisma.message.create.mockResolvedValue(simulatedMessage());
  prisma.deal.create.mockResolvedValue(simulatedDeal());
  prisma.dealStageHistory.create.mockResolvedValue({});
  prisma.contactTag.createMany.mockResolvedValue({ count: 0 });
  prisma.dealTag.createMany.mockResolvedValue({ count: 0 });
  prisma.activity.create.mockResolvedValue({ id: "activity-simulated" });
  prisma.channel.update.mockResolvedValue({});
  prisma.auditLog.create.mockResolvedValue({});
}

describe("PipelineChannelsService", () => {
  let prisma: PrismaMock;
  let service: PipelineChannelsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PipelineChannelsService(prisma as unknown as PrismaService);
    prisma.pipeline.findFirst.mockResolvedValue({
      id: pipelineId,
      name: "Novos leads",
    });
    prisma.auditLog.create.mockResolvedValue({});
  });

  it("lists shared Channel accounts without exposing configuration or secret references", async () => {
    prisma.channel.findMany.mockResolvedValue([channel()]);
    prisma.pipelineChannelConnection.findMany.mockResolvedValue([
      { id: connectionId, channelId, active: false },
    ]);

    await expect(service.available(organizationId, pipelineId)).resolves.toEqual({
      data: [
        expect.objectContaining({
          id: channelId,
          provider: "WHATSAPP",
          displayName: "WhatsApp Xingyu",
          connected: true,
          connectionId,
          connectionActive: false,
        }),
      ],
    });

    const query = prisma.channel.findMany.mock.calls[0]?.[0] as {
      select: Record<string, boolean>;
    };
    expect(query.select).not.toHaveProperty("config");
    expect(query.select).not.toHaveProperty("secretReference");
  });

  it("connects an account transactionally after organization and stage validation", async () => {
    const created = connection();
    prisma.channel.findFirst.mockResolvedValue(channel());
    prisma.pipelineChannelConnection.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(created);
    prisma.pipelineStage.findFirst.mockResolvedValue({
      id: stageId,
      type: "OPEN",
    });
    prisma.pipelineChannelConnection.create.mockResolvedValue(created);

    await expect(
      service.connect(
        organizationId,
        pipelineId,
        {
          channelId,
          defaultStageId: stageId,
          source: " WhatsApp ",
        },
        userId,
      ),
    ).resolves.toEqual(expect.objectContaining({ id: connectionId, defaultTags: [] }));

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.pipelineChannelConnection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        pipelineId,
        channelId,
        defaultStageId: stageId,
        source: "WhatsApp",
        active: true,
        duplicateStrategy: "MERGE",
        routingMode: "PIPELINE_DEFAULTS",
      }),
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        userId,
        action: "CONNECT_PIPELINE_CHANNEL",
        entityType: "PipelineChannelConnection",
        entityId: connectionId,
      }),
    });
  });

  it("rejects a stage from another pipeline before persisting the connection", async () => {
    prisma.channel.findFirst.mockResolvedValue(channel());
    prisma.pipelineChannelConnection.findFirst.mockResolvedValue(null);
    prisma.pipelineStage.findFirst.mockResolvedValue(null);

    await expect(
      service.connect(
        organizationId,
        pipelineId,
        { channelId, defaultStageId: "stage-from-another-pipeline" },
        userId,
      ),
    ).rejects.toThrow(new BadRequestException("Default stage is invalid"));

    expect(prisma.pipelineChannelConnection.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate live connections and inactive integration accounts", async () => {
    prisma.channel.findFirst.mockResolvedValue(channel());
    prisma.pipelineChannelConnection.findFirst.mockResolvedValue({
      id: "already-connected",
    });

    await expect(
      service.connect(organizationId, pipelineId, { channelId, defaultStageId: stageId }, userId),
    ).rejects.toThrow(new ConflictException("This channel is already connected to the pipeline"));

    prisma.channel.findFirst.mockResolvedValue(channel({ isActive: false, status: "INACTIVE" }));
    prisma.pipelineChannelConnection.findFirst.mockReset();
    await expect(
      service.connect(organizationId, pipelineId, { channelId, defaultStageId: stageId }, userId),
    ).rejects.toThrow(new ConflictException("Channel account is not active"));
  });

  it("does not allow edit to clear the stage or reactivate an inactive account", async () => {
    prisma.pipelineChannelConnection.findFirst.mockResolvedValue(connection());

    await expect(
      service.update(
        organizationId,
        pipelineId,
        connectionId,
        { defaultStageId: null as unknown as string },
        userId,
      ),
    ).rejects.toThrow(new BadRequestException("A default stage is required"));

    prisma.channel.findFirst.mockResolvedValue(channel({ isActive: false, status: "INACTIVE" }));
    await expect(
      service.update(organizationId, pipelineId, connectionId, { active: true }, userId),
    ).rejects.toThrow(new ConflictException("Channel account is not active"));
    expect(prisma.pipelineChannelConnection.update).not.toHaveBeenCalled();
  });

  it("pauses and resumes a route idempotently with audit records", async () => {
    const activeConnection = connection();
    const pausedConnection = connection({ active: false });
    prisma.pipelineChannelConnection.findFirst
      .mockResolvedValueOnce(activeConnection)
      .mockResolvedValueOnce(pausedConnection)
      .mockResolvedValueOnce(pausedConnection)
      .mockResolvedValueOnce(activeConnection);
    prisma.pipelineChannelConnection.update
      .mockResolvedValueOnce(pausedConnection)
      .mockResolvedValueOnce(activeConnection);

    await expect(service.pause(organizationId, pipelineId, connectionId, userId)).resolves.toEqual(
      expect.objectContaining({ active: false }),
    );
    await expect(service.resume(organizationId, pipelineId, connectionId, userId)).resolves.toEqual(
      expect.objectContaining({ active: true }),
    );

    expect(prisma.pipelineChannelConnection.update).toHaveBeenNthCalledWith(1, {
      where: { id: connectionId },
      data: { active: false },
    });
    expect(prisma.pipelineChannelConnection.update).toHaveBeenNthCalledWith(2, {
      where: { id: connectionId },
      data: { active: true },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it("runs the DEMO test locally, records sync state, and never reads credentials", async () => {
    prisma.pipelineChannelConnection.findFirst.mockResolvedValue(connection());
    prisma.channel.update.mockResolvedValue({});

    const result = await service.test(organizationId, pipelineId, connectionId, userId);

    expect(result).toEqual({
      ok: true,
      mode: "DEMO",
      testedAt: expect.any(Date),
      connectionId,
      channel: {
        id: channelId,
        type: "WHATSAPP",
        name: "WhatsApp Xingyu",
        status: "ACTIVE",
      },
    });
    expect(prisma.channel.update).toHaveBeenCalledWith({
      where: { id: channelId },
      data: {
        lastSyncAt: expect.any(Date),
        lastErrorAt: null,
        lastErrorMessage: null,
      },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "TEST_PIPELINE_CHANNEL" }),
    });
  });

  describe("DEMO lead simulation", () => {
    const originalDemoMode = process.env.DEMO_MODE;

    beforeEach(() => {
      process.env.DEMO_MODE = "true";
    });

    afterAll(() => {
      if (originalDemoMode === undefined) {
        delete process.env.DEMO_MODE;
      } else {
        process.env.DEMO_MODE = originalDemoMode;
      }
    });

    it("persists the full inbound graph atomically with normalized identities and 0.29 value", async () => {
      prepareSimulation(prisma);

      const result = await service.simulate(
        organizationId,
        pipelineId,
        connectionId,
        {
          name: "  Marina   Oliveira ",
          phone: "(11) 99999-0000",
          email: "MARINA@EXAMPLE.COM",
          instagram: "https://instagram.com/Marina",
          message: " Quero receber o catálogo ",
          estimatedValue: 0.29,
        },
        userId,
      );

      expect(result).toEqual(
        expect.objectContaining({
          ok: true,
          mode: "DEMO",
          simulationId: expect.any(String),
          simulatedAt: expect.any(Date),
          connectionId,
          matchedContactId: null,
          contactCreated: true,
          contactReused: false,
          contact: simulatedContact(),
          conversation: simulatedConversation(),
          message: simulatedMessage(),
          deal: simulatedDeal(),
          appliedTagIds: [],
        }),
      );
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: "Serializable",
      });
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(4);
      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId,
            OR: expect.arrayContaining([
              { OR: [{ phone: "+5511999990000" }, { whatsapp: "+5511999990000" }] },
              {
                email: {
                  equals: "marina@example.com",
                  mode: "insensitive",
                },
              },
              {
                instagram: {
                  equals: "@marina",
                  mode: "insensitive",
                },
              },
            ]),
          }),
        }),
      );
      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId,
          firstName: "Marina",
          lastName: "Oliveira",
          phone: "+5511999990000",
          whatsapp: "+5511999990000",
          email: "marina@example.com",
          instagram: "@marina",
          status: "LEAD",
        }),
        select: expect.any(Object),
      });
      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId,
          contactId: "contact-simulated",
          channelId,
          status: "OPEN",
          unreadCount: 1,
          lastMessageAt: expect.any(Date),
        }),
        select: expect.any(Object),
      });
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conversationId: "conversation-simulated",
          channelId,
          senderId: null,
          direction: "INBOUND",
          status: "DELIVERED",
          body: "Quero receber o catálogo",
          metadata: expect.objectContaining({
            demoMode: true,
            pipelineChannelConnectionId: connectionId,
          }),
        }),
        select: expect.any(Object),
      });
      expect(prisma.deal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId,
          pipelineId,
          stageId,
          contactId: "contact-simulated",
          conversationId: "conversation-simulated",
          leadSequence: 42,
          value: 0.29,
          status: "OPEN",
        }),
        select: expect.any(Object),
      });
      expect(prisma.dealStageHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dealId: "deal-simulated",
          stageId,
          fromStageId: null,
          movedById: userId,
        }),
      });
      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId,
          type: "MESSAGE_RECEIVED",
          contactId: "contact-simulated",
          conversationId: "conversation-simulated",
          dealId: "deal-simulated",
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: "SIMULATE_PIPELINE_CHANNEL",
          entityId: connectionId,
        }),
      });
    });

    it("MERGE reuses one matching contact without creating a duplicate", async () => {
      prepareSimulation(prisma, connection({ createConversation: false, createDeal: false }));
      prisma.contact.findMany.mockResolvedValue([simulatedContact("contact-existing")]);

      const result = await service.simulate(
        organizationId,
        pipelineId,
        connectionId,
        {
          name: "Marina Oliveira",
          phone: "+55 11 99999-0000",
          message: "Nova mensagem",
        },
        userId,
      );

      expect(result).toEqual(
        expect.objectContaining({
          matchedContactId: "contact-existing",
          contactCreated: false,
          contactReused: true,
          contact: simulatedContact("contact-existing"),
          conversation: null,
          message: null,
          deal: null,
        }),
      );
      expect(prisma.contact.create).not.toHaveBeenCalled();
      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(prisma.deal.create).not.toHaveBeenCalled();
    });

    it("REJECT aborts before any entity write when an identity already exists", async () => {
      prepareSimulation(prisma, connection({ duplicateStrategy: "REJECT" }));
      prisma.contact.findMany.mockResolvedValue([simulatedContact("contact-existing")]);

      await expect(
        service.simulate(
          organizationId,
          pipelineId,
          connectionId,
          {
            name: "Marina Oliveira",
            email: "marina@example.com",
            message: "Mensagem duplicada",
          },
          userId,
        ),
      ).rejects.toThrow(
        new ConflictException(
          "A contact with the supplied phone, email, or Instagram already exists",
        ),
      );

      expect(prisma.contact.create).not.toHaveBeenCalled();
      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(prisma.message.create).not.toHaveBeenCalled();
      expect(prisma.deal.create).not.toHaveBeenCalled();
      expect(prisma.activity.create).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
    });

    it("MERGE rejects identifiers resolving to different contacts", async () => {
      prepareSimulation(prisma);
      prisma.contact.findMany.mockResolvedValue([
        simulatedContact("contact-by-phone"),
        simulatedContact("contact-by-email"),
      ]);

      await expect(
        service.simulate(
          organizationId,
          pipelineId,
          connectionId,
          {
            name: "Marina Oliveira",
            phone: "+5511999990000",
            email: "marina@example.com",
            message: "Identidade ambígua",
          },
          userId,
        ),
      ).rejects.toThrow(
        new ConflictException(
          "The supplied identifiers match multiple contacts; merge is ambiguous",
        ),
      );
      expect(prisma.contact.create).not.toHaveBeenCalled();
    });

    it("CREATE_NEW intentionally creates a contact and does not acquire duplicate locks", async () => {
      prepareSimulation(
        prisma,
        connection({
          duplicateStrategy: "CREATE_NEW",
          createConversation: false,
          createDeal: false,
        }),
      );
      prisma.contact.findMany.mockResolvedValue([simulatedContact("contact-existing")]);

      const result = await service.simulate(
        organizationId,
        pipelineId,
        connectionId,
        {
          name: "Marina Oliveira",
          instagram: "@marina",
          message: "Novo registro intencional",
        },
        userId,
      );

      expect(result.contactCreated).toBe(true);
      expect(result.matchedContactId).toBe("contact-existing");
      expect(result.contact?.id).toBe("contact-simulated");
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(prisma.contact.create).toHaveBeenCalledTimes(1);
    });

    it("honors disabled entity flags and applies only compatible tag types", async () => {
      prepareSimulation(
        prisma,
        connection({
          createContact: false,
          createConversation: false,
          createDeal: true,
          defaultTagIds: ["tag-contact", "tag-deal"],
        }),
      );
      prisma.tag.findMany.mockResolvedValue([
        { id: "tag-contact", entityType: "CONTACT" },
        { id: "tag-deal", entityType: "DEAL" },
      ]);
      prisma.deal.create.mockResolvedValue({
        ...simulatedDeal(),
        contactId: null,
        conversationId: null,
      });

      const result = await service.simulate(
        organizationId,
        pipelineId,
        connectionId,
        {
          name: "Lead sem contato",
          message: "Somente oportunidade",
        },
        userId,
      );

      expect(result.contact).toBeNull();
      expect(result.conversation).toBeNull();
      expect(result.message).toBeNull();
      expect(result.deal).toEqual(
        expect.objectContaining({ contactId: null, conversationId: null }),
      );
      expect(result.appliedTagIds).toEqual(["tag-deal"]);
      expect(prisma.contact.create).not.toHaveBeenCalled();
      expect(prisma.conversation.create).not.toHaveBeenCalled();
      expect(prisma.message.create).not.toHaveBeenCalled();
      expect(prisma.contactTag.createMany).not.toHaveBeenCalled();
      expect(prisma.dealTag.createMany).toHaveBeenCalledWith({
        data: [{ dealId: "deal-simulated", tagId: "tag-deal" }],
        skipDuplicates: true,
      });
    });

    it("rejects a paused route or a non-OPEN default stage before lead writes", async () => {
      prepareSimulation(prisma, connection({ active: false }));
      await expect(
        service.simulate(
          organizationId,
          pipelineId,
          connectionId,
          { name: "Lead pausado", message: "Não persistir" },
          userId,
        ),
      ).rejects.toThrow(new ConflictException("Paused connections cannot receive simulated leads"));

      prepareSimulation(prisma);
      prisma.pipelineStage.findFirst.mockResolvedValue(null);
      await expect(
        service.simulate(
          organizationId,
          pipelineId,
          connectionId,
          { name: "Lead sem etapa", message: "Não persistir" },
          userId,
        ),
      ).rejects.toThrow(
        new ConflictException(
          "Connection default stage must be an active OPEN stage in this pipeline",
        ),
      );
      expect(prisma.contact.create).not.toHaveBeenCalled();
      expect(prisma.activity.create).not.toHaveBeenCalled();
    });

    it("propagates a late failure from the single transaction so Prisma rolls all writes back", async () => {
      prepareSimulation(prisma);
      prisma.activity.create.mockRejectedValue(new Error("simulated late persistence failure"));

      await expect(
        service.simulate(
          organizationId,
          pipelineId,
          connectionId,
          {
            name: "Lead rollback",
            phone: "+5511988887777",
            message: "Falha após entidades",
          },
          userId,
        ),
      ).rejects.toThrow("simulated late persistence failure");

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.contact.create).toHaveBeenCalledTimes(1);
      expect(prisma.conversation.create).toHaveBeenCalledTimes(1);
      expect(prisma.message.create).toHaveBeenCalledTimes(1);
      expect(prisma.deal.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
      expect(prisma.channel.update).not.toHaveBeenCalled();
    });

    it("is unavailable when DEMO_MODE is explicitly disabled", async () => {
      process.env.DEMO_MODE = "false";

      await expect(
        service.simulate(
          organizationId,
          pipelineId,
          connectionId,
          { name: "Lead bloqueado", message: "Não executar" },
          userId,
        ),
      ).rejects.toThrow("Pipeline lead simulation is available only when DEMO_MODE is enabled");
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  it("soft-disconnects so historical routing remains auditable", async () => {
    const existing = connection();
    prisma.pipelineChannelConnection.findFirst.mockResolvedValue(existing);
    prisma.pipelineChannelConnection.update.mockResolvedValue({
      ...existing,
      active: false,
      deletedAt: fixedDate,
    });

    await expect(
      service.disconnect(organizationId, pipelineId, connectionId, userId),
    ).resolves.toEqual(expect.objectContaining({ id: connectionId, disconnected: true }));
    expect(prisma.pipelineChannelConnection.update).toHaveBeenCalledWith({
      where: { id: connectionId },
      data: { active: false, deletedAt: expect.any(Date) },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "DISCONNECT_PIPELINE_CHANNEL" }),
    });
  });
});
