import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConversationsService } from "./conversations.service";

type MockMethod = jest.Mock<Promise<unknown>, unknown[]>;

type PrismaMock = {
  conversation: {
    findFirst: MockMethod;
    findMany: MockMethod;
    count: MockMethod;
    update: MockMethod;
    create: MockMethod;
  };
  message: {
    findFirst: MockMethod;
    findMany: MockMethod;
    create: MockMethod;
  };
  messageAttachment: { count: MockMethod };
  leadFile: { count: MockMethod };
  note: { count: MockMethod };
  task: { count: MockMethod; findFirst: MockMethod };
  order: { count: MockMethod; findFirst: MockMethod };
  activity: { count: MockMethod; create: MockMethod };
  attribution: { findFirst: MockMethod };
  $queryRaw: MockMethod;
};

const organizationId = "org-test";

function method(): MockMethod {
  return jest.fn();
}

function createPrismaMock(): PrismaMock {
  return {
    conversation: {
      findFirst: method(),
      findMany: method(),
      count: method(),
      update: method(),
      create: method(),
    },
    message: {
      findFirst: method(),
      findMany: method(),
      create: method(),
    },
    messageAttachment: { count: method() },
    leadFile: { count: method() },
    note: { count: method() },
    task: { count: method(), findFirst: method() },
    order: { count: method(), findFirst: method() },
    activity: { count: method(), create: method() },
    attribution: { findFirst: method() },
    $queryRaw: method(),
  };
}

function conversationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv-1",
    organizationId,
    contactId: "contact-1",
    channelId: "channel-1",
    assigneeId: "user-1",
    subject: "Support",
    status: "OPEN",
    lastMessageAt: new Date("2026-07-30T12:00:00.000Z"),
    unreadCount: 2,
    createdAt: new Date("2026-07-29T12:00:00.000Z"),
    updatedAt: new Date("2026-07-30T12:00:00.000Z"),
    contact: {
      id: "contact-1",
      firstName: "Ana",
      lastName: "Silva",
      tags: [],
      email: null,
      phone: null,
      whatsapp: null,
      companyId: null,
      ownerId: null,
      teamId: null,
      company: null,
    },
    assignee: { id: "user-1", name: "Agent", avatarUrl: null },
    channel: {
      id: "channel-1",
      type: "WHATSAPP",
      name: "WhatsApp",
      displayName: "WhatsApp Business",
      provider: "meta",
      externalAccountId: "acc-1",
      status: "ACTIVE",
    },
    deal: {
      id: "deal-1",
      name: "Deal A",
      pipelineId: "pipeline-1",
      stageId: "stage-1",
      priority: "MEDIUM",
      createdAt: new Date("2026-08-10T17:32:00.000Z"),
      stage: { id: "stage-1", name: "Qualification", pipelineId: "pipeline-1", color: "#fff" },
      pipeline: { id: "pipeline-1", name: "Sales", color: "#000" },
      owner: { id: "user-1", name: "Agent", avatarUrl: null },
      tags: [],
    },
    ...overrides,
  };
}

describe("ConversationsService", () => {
  let prisma: PrismaMock;
  let service: ConversationsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ConversationsService(prisma as unknown as PrismaService);
  });

  describe("findOne", () => {
    it("does not include messages array in the response", async () => {
      const row = conversationRow();
      prisma.conversation.findFirst.mockResolvedValue(row);
      prisma.message.findFirst.mockResolvedValue({
        body: "Latest preview",
        sentAt: new Date("2026-07-30T12:00:00.000Z"),
      });

      const result = await service.findOne(organizationId, "conv-1");

      expect(result).not.toHaveProperty("messages");
      expect(result.lastMessagePreview).toBe("Latest preview");
      expect(result.contact?.name).toBe("Ana Silva");
      expect(result.channel?.displayName).toBe("WhatsApp Business");
      expect(result.deal?.stage?.name).toBe("Qualification");
      expect(prisma.conversation.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.not.objectContaining({
            messages: expect.anything(),
          }),
        }),
      );
    });

    it("throws when conversation is missing", async () => {
      prisma.conversation.findFirst.mockResolvedValue(null);
      await expect(service.findOne(organizationId, "missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe("findAll", () => {
    it("filters by pipelineId through linked deal", async () => {
      prisma.conversation.findMany.mockResolvedValue([]);
      prisma.message.findMany.mockResolvedValue([]);

      await service.findAll(organizationId, { pipelineId: "pipeline-1", page: 1, pageSize: 20 });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                deal: expect.objectContaining({
                  pipelineId: "pipeline-1",
                  deletedAt: null,
                }),
              }),
            ]),
          }),
          select: expect.any(Object),
        }),
      );
    });

    it("filters by channels stages tags period and replyStatus", async () => {
      prisma.conversation.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prisma.message.findMany.mockResolvedValue([]);
      prisma.$queryRaw.mockResolvedValue([{ id: "conv-9" }]);

      await service.findAll(organizationId, {
        page: 1,
        pageSize: 20,
        channels: ["ch-1", "ch-2"],
        stages: ["st-1"],
        tags: ["tag-1"],
        unreadOnly: true,
        replyStatus: "customer",
        conversationState: "open",
        period: "7d",
      });

      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.any(Object),
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                channelId: { in: ["ch-1", "ch-2"] },
                unreadCount: { gt: 0 },
                status: { in: ["OPEN", "PENDING"] },
              }),
              expect.objectContaining({
                id: { in: ["conv-9"] },
              }),
            ]),
          }),
        }),
      );
    });

    it("returns light list items without messages", async () => {
      const row = conversationRow();
      prisma.conversation.findMany
        .mockResolvedValueOnce([
          {
            id: row.id,
            status: row.status,
            unreadCount: row.unreadCount,
            lastMessageAt: row.lastMessageAt,
            updatedAt: row.updatedAt,
          },
        ])
        .mockResolvedValueOnce([row]);
      prisma.message.findMany
        .mockResolvedValueOnce([
          { conversationId: "conv-1", direction: "INBOUND" },
        ])
        .mockResolvedValueOnce([
          { conversationId: "conv-1", body: "Hello there" },
        ]);

      const result = await service.findAll(organizationId, { page: 1, pageSize: 20 });

      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: "conv-1",
          lastMessagePreview: "Hello there",
          currentDeal: expect.objectContaining({ pipelineId: "pipeline-1" }),
          channel: expect.objectContaining({ type: "WHATSAPP" }),
        }),
      );
      expect(result.data[0]).not.toHaveProperty("messages");
    });
  });

  describe("listMessages", () => {
    it("returns recent messages in ascending order by default", async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: "conv-1", contactId: "contact-1" });
      const messages = [
        {
          id: "msg-1",
          conversationId: "conv-1",
          body: "Older",
          sentAt: new Date("2026-07-30T10:00:00.000Z"),
          attachments: [],
          sender: { id: "user-1", name: "Agent" },
        },
        {
          id: "msg-2",
          conversationId: "conv-1",
          body: "Newer",
          sentAt: new Date("2026-07-30T11:00:00.000Z"),
          attachments: [{ id: "att-1", fileName: "file.pdf" }],
          sender: null,
        },
      ];
      prisma.message.findMany.mockResolvedValue([...messages].reverse());

      const result = await service.listMessages(organizationId, "conv-1", {});

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ conversationId: "conv-1", deletedAt: null }),
          orderBy: [{ sentAt: "desc" }, { id: "desc" }],
          take: 50,
          include: {
            attachments: true,
            sender: { select: { id: true, name: true } },
          },
        }),
      );
      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.body).toBe("Older");
      expect(result.data[0]?.sender).toEqual({ id: "user-1", name: "Agent" });
      expect(result.data[0]?.sender).not.toHaveProperty("email");
      expect(result.data[1]?.attachments).toHaveLength(1);
      expect(result.meta).toEqual(
        expect.objectContaining({ pageSize: 50, hasMore: false, nextCursor: "msg-1" }),
      );
    });

    it("loads older messages when cursor and before are provided", async () => {
      prisma.conversation.findFirst
        .mockResolvedValueOnce({ id: "conv-1", contactId: "contact-1" })
        .mockResolvedValueOnce({
          id: "msg-2",
          sentAt: new Date("2026-07-30T11:00:00.000Z"),
        });
      prisma.message.findMany.mockResolvedValue([
        {
          id: "msg-1",
          body: "Older",
          sentAt: new Date("2026-07-30T10:00:00.000Z"),
          attachments: [],
          sender: null,
        },
      ]);

      const result = await service.listMessages(organizationId, "conv-1", {
        cursor: "msg-2",
        before: true,
        pageSize: 25,
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            conversationId: "conv-1",
            OR: expect.any(Array),
          }),
          take: 25,
        }),
      );
      expect(result.data[0]?.id).toBe("msg-1");
    });
  });

  describe("getContext", () => {
    it("returns summary shape with counts and no message lists", async () => {
      const row = conversationRow();
      prisma.conversation.findFirst.mockResolvedValue(row);
      prisma.message.findFirst.mockImplementation(async (args: unknown) => {
        const orderBy = (args as { orderBy?: { sentAt?: string } })?.orderBy;
        if (orderBy?.sentAt === "asc") {
          return {
            direction: "INBOUND",
            sentAt: new Date("2026-08-10T17:32:00.000Z"),
          };
        }
        return { body: "Preview", sentAt: new Date() };
      });
      prisma.note.count.mockResolvedValue(3);
      prisma.task.count.mockResolvedValue(2);
      prisma.order.count.mockResolvedValue(1);
      prisma.activity.count.mockResolvedValue(5);
      prisma.leadFile.count.mockResolvedValue(4);
      prisma.task.findFirst.mockResolvedValue({
        id: "task-1",
        title: "Follow up",
        dueAt: new Date(),
        status: "PENDING",
        priority: "HIGH",
        assignee: { id: "user-1", name: "Agent" },
      });
      prisma.order.findFirst.mockResolvedValue({
        id: "order-1",
        number: "1001",
        status: "ORDER_PLACED",
        finalValue: 100,
        orderedAt: new Date(),
      });
      prisma.attribution.findFirst.mockResolvedValue(null);

      const result = await service.getContext(organizationId, "conv-1");

      expect(result).toEqual(
        expect.objectContaining({
          conversation: expect.objectContaining({ id: "conv-1", lastMessagePreview: "Preview" }),
          contact: expect.objectContaining({ name: "Ana Silva" }),
          currentDeal: expect.objectContaining({ id: "deal-1" }),
          pipeline: expect.objectContaining({ id: "pipeline-1" }),
          stage: expect.objectContaining({ id: "stage-1" }),
          channel: expect.objectContaining({ id: "channel-1" }),
          nextTask: expect.objectContaining({ id: "task-1" }),
          lastOrder: expect.objectContaining({ number: "1001" }),
          tracking: expect.objectContaining({
            firstContactAt: new Date("2026-08-10T17:32:00.000Z"),
            firstContactDirection: "INBOUND",
            leadCreatedAt: new Date("2026-08-10T17:32:00.000Z"),
            utm: null,
            landingPage: null,
            referrer: null,
          }),
          counts: {
            notesCount: 3,
            filesCount: 4,
            tasksCount: 2,
            ordersCount: 1,
            activitiesCount: 5,
          },
        }),
      );
      expect(result).not.toHaveProperty("messages");
      expect(result).not.toHaveProperty("notes");
      expect(prisma.message.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { sentAt: "asc" },
          select: { direction: true, sentAt: true },
        }),
      );
    });

    it("maps first OUTBOUND message and structured Attribution UTMs", async () => {
      prisma.conversation.findFirst.mockResolvedValue(conversationRow());
      prisma.message.findFirst.mockImplementation(async (args: unknown) => {
        const orderBy = (args as { orderBy?: { sentAt?: string } })?.orderBy;
        if (orderBy?.sentAt === "asc") {
          return {
            direction: "OUTBOUND",
            sentAt: new Date("2026-08-01T11:00:00.000Z"),
          };
        }
        return { body: "Preview", sentAt: new Date() };
      });
      prisma.note.count.mockResolvedValue(0);
      prisma.task.count.mockResolvedValue(0);
      prisma.order.count.mockResolvedValue(0);
      prisma.activity.count.mockResolvedValue(0);
      prisma.leadFile.count.mockResolvedValue(0);
      prisma.task.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.attribution.findFirst.mockResolvedValue({
        source: "meta",
        medium: "paid_social",
        campaign: "china_no_brasil",
        content: "video_03",
        term: null,
        page: "/collections/origem",
      });

      const result = await service.getContext(organizationId, "conv-1");

      expect(result.tracking).toEqual(
        expect.objectContaining({
          firstContactDirection: "OUTBOUND",
          utm: {
            source: "meta",
            medium: "paid_social",
            campaign: "china_no_brasil",
            content: "video_03",
            term: null,
          },
          landingPage: "/collections/origem",
        }),
      );
      expect(prisma.attribution.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contactId: "contact-1",
            orderId: null,
          }),
          orderBy: { createdAt: "asc" },
        }),
      );
    });

    it("omits invented UTMs when Attribution is empty", async () => {
      prisma.conversation.findFirst.mockResolvedValue(
        conversationRow({ deal: null }),
      );
      prisma.message.findFirst.mockImplementation(async (args: unknown) => {
        const orderBy = (args as { orderBy?: { sentAt?: string } })?.orderBy;
        if (orderBy?.sentAt === "asc") return null;
        return { body: null, sentAt: null };
      });
      prisma.note.count.mockResolvedValue(0);
      prisma.task.count.mockResolvedValue(0);
      prisma.order.count.mockResolvedValue(0);
      prisma.activity.count.mockResolvedValue(0);
      prisma.messageAttachment.count.mockResolvedValue(0);
      prisma.task.findFirst.mockResolvedValue(null);
      prisma.order.findFirst.mockResolvedValue(null);
      prisma.attribution.findFirst.mockResolvedValue(null);

      const result = await service.getContext(organizationId, "conv-1");

      expect(result.tracking.firstContactAt).toBeNull();
      expect(result.tracking.firstContactDirection).toBeNull();
      expect(result.tracking.leadCreatedAt).toBeNull();
      expect(result.tracking.utm).toBeNull();
    });
  });

  describe("markAsRead", () => {
    it("sets unreadCount to zero", async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: "conv-1", contactId: "contact-1" });
      prisma.conversation.update.mockResolvedValue({
        id: "conv-1",
        unreadCount: 0,
        updatedAt: new Date(),
      });

      const result = await service.markAsRead(organizationId, "conv-1");

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: "conv-1" },
        data: { unreadCount: 0 },
        select: { id: true, unreadCount: true, updatedAt: true },
      });
      expect(result.unreadCount).toBe(0);
    });
  });

  describe("sendMessage", () => {
    it("stores senderId for outbound messages from the authenticated user", async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: "conv-1", contactId: "contact-1" });
      prisma.message.create.mockResolvedValue({
        id: "msg-new",
        conversationId: "conv-1",
        body: "Olá",
        direction: "OUTBOUND",
        senderId: "auth-user",
        status: "SENT",
        attachments: [],
        sender: { id: "auth-user", name: "Vendedora" },
      });
      prisma.conversation.update.mockResolvedValue({});
      prisma.activity.create.mockResolvedValue({});

      const result = await service.sendMessage(
        organizationId,
        "conv-1",
        { body: "Olá" },
        "auth-user",
      );

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: "Olá",
            direction: "OUTBOUND",
            senderId: "auth-user",
          }),
          include: {
            attachments: true,
            sender: { select: { id: true, name: true } },
          },
        }),
      );
      expect(result.sender).toEqual({ id: "auth-user", name: "Vendedora" });
    });

    it("rejects empty payloads without files", async () => {
      prisma.conversation.findFirst.mockResolvedValue({ id: "conv-1", contactId: "contact-1" });
      await expect(
        service.sendMessage(organizationId, "conv-1", { body: "   " }, "auth-user"),
      ).rejects.toThrow("Informe uma mensagem ou anexe um arquivo.");
    });
  });
});
