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
  auditLog: { create: MockMethod };
  $transaction: jest.Mock<Promise<unknown>, [(tx: PrismaMock) => Promise<unknown>]>;
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
    auditLog: { create: method() },
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

function connection(overrides: Partial<{ active: boolean; defaultOwnerId: string | null }> = {}) {
  return {
    id: connectionId,
    organizationId,
    pipelineId,
    channelId,
    defaultStageId: stageId,
    defaultOwnerId: overrides.defaultOwnerId ?? null,
    defaultTeamId: null,
    defaultTagIds: [],
    source: "WhatsApp",
    campaignId: null,
    active: overrides.active ?? true,
    createContact: true,
    createConversation: true,
    createDeal: true,
    duplicateStrategy: "MERGE" as const,
    routingMode: "PIPELINE_DEFAULTS" as const,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    deletedAt: null,
    pipeline: { id: pipelineId, name: "Novos leads" },
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
    prisma.pipelineStage.findFirst.mockResolvedValue({ id: stageId });
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
