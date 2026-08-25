import { PrismaService } from "../prisma/prisma.service";
import { ConnectionsInboundService } from "./connections-inbound.service";

const channel = { id: "channel-a", organizationId: "org-a" };
const event = {
  kind: "inbound_message" as const,
  externalEventId: "event-a",
  externalMessageId: "message-external-a",
  phone: "+55 (11) 99999-9999",
  contactName: "Maria Silva",
  body: "Olá",
  occurredAt: new Date("2026-08-23T12:00:00Z"),
};

function createPrisma() {
  const prisma: any = {
    providerEventReceipt: { findUnique: jest.fn(), create: jest.fn() },
    pipelineChannelConnection: { findFirst: jest.fn(), findMany: jest.fn() },
    contact: { findFirst: jest.fn(), create: jest.fn() },
    conversation: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    deal: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    pipelineStage: { findFirst: jest.fn() },
    dealStageHistory: { create: jest.fn() },
    message: { create: jest.fn() },
    activity: { create: jest.fn() },
    channel: { findFirst: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((callback) => callback(prisma)),
  };
  return prisma;
}

function prepareInbound(prisma: any) {
  prisma.providerEventReceipt.findUnique.mockResolvedValue(null);
  prisma.providerEventReceipt.create.mockResolvedValue({ id: "receipt-a" });
  prisma.pipelineChannelConnection.findFirst.mockResolvedValue({
    id: "route-a",
    pipelineId: "pipeline-a",
    defaultStageId: "stage-a",
    defaultOwnerId: null,
    defaultTeamId: null,
    source: "WhatsApp",
    createContact: true,
    createConversation: true,
    createDeal: true,
    pipeline: { name: "Vendas", defaultOwnerId: null, defaultTeamId: null },
  });
  prisma.pipelineChannelConnection.findMany.mockResolvedValue([{ pipelineId: "pipeline-a" }]);
  prisma.contact.findFirst.mockResolvedValue({
    id: "contact-a",
    firstName: "Maria",
    lastName: "Silva",
  });
  prisma.conversation.findFirst.mockResolvedValue({ id: "conversation-a" });
  prisma.deal.findFirst.mockResolvedValue({
    id: "deal-a",
    conversationId: "conversation-a",
  });
  prisma.message.create.mockResolvedValue({ id: "message-a" });
}

describe("ConnectionsInboundService", () => {
  it("resolves the configured default route", async () => {
    const prisma = createPrisma();
    prepareInbound(prisma);
    const service = new ConnectionsInboundService(prisma as PrismaService);

    await service.process(channel, event);

    expect(prisma.pipelineChannelConnection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-a",
          channelId: "channel-a",
          active: true,
          isDefault: true,
        }),
      }),
    );
  });

  it("reuses one open deal across two messages", async () => {
    const prisma = createPrisma();
    prepareInbound(prisma);
    const service = new ConnectionsInboundService(prisma as PrismaService);

    await service.process(channel, event);
    await service.process(channel, { ...event, externalEventId: "event-b" });

    expect(prisma.deal.create).not.toHaveBeenCalled();
    expect(prisma.deal.update).toHaveBeenCalledTimes(2);
    expect(prisma.message.create).toHaveBeenCalledTimes(2);
  });

  it("acknowledges an already received webhook without side effects", async () => {
    const prisma = createPrisma();
    prisma.providerEventReceipt.findUnique.mockResolvedValue({ id: "receipt-a" });
    const service = new ConnectionsInboundService(prisma as PrismaService);

    await expect(service.process(channel, event)).resolves.toEqual({
      accepted: true,
      duplicate: true,
    });
    expect(prisma.pipelineChannelConnection.findFirst).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it("resolves a tenant only from provider and external instance", async () => {
    const prisma = createPrisma();
    prisma.channel.findFirst.mockResolvedValue({
      id: "channel-b",
      organizationId: "org-b",
      provider: "fake",
      externalAccountId: "instance-b",
      lifecycleStatus: "CONNECTED",
    });
    const service = new ConnectionsInboundService(prisma as PrismaService);

    await expect(service.resolveChannel("fake", "instance-b")).resolves.toEqual(
      expect.objectContaining({ organizationId: "org-b" }),
    );
    expect(prisma.channel.findFirst).toHaveBeenCalledWith({
      where: {
        provider: { equals: "fake", mode: "insensitive" },
        externalAccountId: "instance-b",
        deletedAt: null,
        archivedAt: null,
      },
      select: expect.any(Object),
    });
  });

  it("acknowledges ignored provider events without side effects", async () => {
    const prisma = createPrisma();
    const service = new ConnectionsInboundService(prisma as PrismaService);

    await expect(service.process(channel, { kind: "ignored", reason: "fromMe" })).resolves.toEqual({
      accepted: true,
      ignored: true,
    });
    expect(prisma.providerEventReceipt.create).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});
