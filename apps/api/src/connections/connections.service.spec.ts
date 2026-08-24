import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConnectionLifecycleStatus } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { ConnectionsService } from "./connections.service";
import { ConnectionProviderRegistry } from "./providers/connection-provider.registry";

const organizationId = "org-a";
const connectionId = "channel-a";

function connection(overrides: Record<string, unknown> = {}) {
  return {
    id: connectionId,
    organizationId,
    type: "WHATSAPP",
    name: "WhatsApp Vendas",
    provider: "fake",
    externalAccountId: "fake-instance",
    displayAccount: null,
    lifecycleStatus: ConnectionLifecycleStatus.DRAFT,
    configurationComplete: false,
    connectedAt: null,
    disconnectedAt: null,
    lastActivityAt: null,
    lastInboundAt: null,
    lastOutboundAt: null,
    lastErrorAt: null,
    lastErrorCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    archivedAt: null,
    accessMode: "ORGANIZATION",
    ownerUserId: null,
    pipelineConnections: [],
    teamAccesses: [],
    userAccesses: [],
    ...overrides,
  };
}

describe("ConnectionsService", () => {
  let prisma: any;
  let service: ConnectionsService;

  beforeEach(() => {
    prisma = {
      channel: { findFirst: jest.fn(), update: jest.fn() },
      pipeline: { findMany: jest.fn() },
      pipelineChannelConnection: {
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((callback) => callback(prisma)),
    };
    service = new ConnectionsService(
      prisma as PrismaService,
      { get: jest.fn(), defaultProvider: jest.fn() } as unknown as ConnectionProviderRegistry,
    );
  });

  it("rejects a default pipeline outside the enabled list", async () => {
    prisma.channel.findFirst.mockResolvedValue(connection());
    await expect(
      service.updateRouting(
        organizationId,
        connectionId,
        { enabledPipelineIds: ["pipeline-a"], defaultPipelineId: "pipeline-b" },
        "admin-a",
      ),
    ).rejects.toThrow(new BadRequestException("Default pipeline must be enabled"));
    expect(prisma.pipeline.findMany).not.toHaveBeenCalled();
  });

  it("marks exactly the selected enabled pipeline as the default route", async () => {
    prisma.channel.findFirst
      .mockResolvedValueOnce(connection())
      .mockResolvedValueOnce(connection());
    prisma.pipeline.findMany.mockResolvedValue([
      { id: "pipeline-a", stages: [{ id: "stage-a" }] },
      { id: "pipeline-b", stages: [{ id: "stage-b" }] },
    ]);
    prisma.pipelineChannelConnection.findFirst.mockResolvedValue(null);

    await service.updateRouting(
      organizationId,
      connectionId,
      {
        enabledPipelineIds: ["pipeline-a", "pipeline-b"],
        defaultPipelineId: "pipeline-b",
      },
      "admin-a",
    );

    expect(prisma.pipelineChannelConnection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pipelineId: "pipeline-a",
        isDefault: false,
      }),
    });
    expect(prisma.pipelineChannelConnection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pipelineId: "pipeline-b",
        isDefault: true,
      }),
    });
  });

  it("always scopes connection lookup to the authenticated tenant", async () => {
    prisma.channel.findFirst.mockResolvedValue(null);
    await expect(service.get("org-b", connectionId)).rejects.toThrow(NotFoundException);
    expect(prisma.channel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: connectionId, organizationId: "org-b" }),
      }),
    );
  });
});
