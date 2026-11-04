import { randomUUID } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { configureTestDatabase } from "../common/test-database";
import { AuthService } from "../auth/auth.service";
import { ConnectionsInboundService } from "../connections/connections-inbound.service";

describe("security concurrency on isolated PostgreSQL", () => {
  let prisma: PrismaService;
  let organizationId: string;
  const config = { getOrThrow: () => "isolated-test-access-secret" } as unknown as ConfigService;
  const response = () => ({ cookie: jest.fn(), clearCookie: jest.fn() });
  const request = (token: string) => ({
    cookies: { xingyu_refresh_token: token },
    headers: {},
    socket: {},
    ip: "127.0.0.1",
  });
  beforeAll(async () => {
    configureTestDatabase();
    prisma = new PrismaService();
    await prisma.$connect();
    const org = await prisma.organization.create({
      data: { name: "Concurrency test fixture", slug: "security-" + randomUUID() },
    });
    organizationId = org.id;
  });
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  async function session() {
    const auth = new AuthService(prisma, new JwtService(), config);
    const user = await prisma.user.create({
      data: {
        organizationId,
        name: "Synthetic user",
        email: randomUUID() + "@example.invalid",
        authRole: "ADMIN",
        status: "ACTIVE",
      },
    });
    const raw = randomUUID();
    const previous = await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: auth.hashRefreshToken(raw),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    return { auth, user, raw, previous };
  }

  it("creates exactly one successor across two simultaneous service instances", async () => {
    const { auth, user, raw, previous } = await session();
    const other = new AuthService(prisma, new JwtService(), config);
    // Both requests observe the unrevoked session before attempting the update.
    // The database, rather than an in-process mutex, must select the winner.
    const find = prisma.userSession.findFirst.bind(prisma.userSession);
    let reads = 0;
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const spy = jest.spyOn(prisma.userSession, "findFirst").mockImplementation((async (
      args: any,
    ) => {
      const result = await find(args);
      if (args.where?.refreshTokenHash === previous.refreshTokenHash) {
        if (++reads === 2) release();
        await barrier;
      }
      return result;
    }) as never);
    const a = response(),
      b = response();
    let results: PromiseSettledResult<unknown>[];
    try {
      results = await Promise.allSettled([
        auth.refresh(request(raw) as never, a as never),
        other.refresh(request(raw) as never, b as never),
      ]);
    } finally {
      spy.mockRestore();
    }
    expect(results!.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results!.filter((result) => result.status === "rejected")).toHaveLength(1);
    expect(await prisma.userSession.count({ where: { userId: user.id } })).toBe(2);
    expect(await prisma.userSession.count({ where: { userId: user.id, revokedAt: null } })).toBe(1);
    expect(a.cookie.mock.calls.length + b.cookie.mock.calls.length).toBe(2);
    expect(a.clearCookie.mock.calls.length + b.clearCookie.mock.calls.length).toBe(0);
  }, 30000);

  it("rolls back token consumption when successor persistence fails", async () => {
    const { raw, previous, user } = await session();
    const failing = new Proxy(prisma, {
      get(target, key) {
        if (key !== "$transaction") return Reflect.get(target, key);
        return (work: (tx: unknown) => unknown) =>
          target.$transaction(async (tx) =>
            work(
              new Proxy(tx, {
                get(client, property) {
                  if (property !== "userSession") return Reflect.get(client, property);
                  return new Proxy(client.userSession, {
                    get(delegate, method) {
                      return method === "create"
                        ? async () => {
                            throw new Error("synthetic storage failure");
                          }
                        : Reflect.get(delegate, method);
                    },
                  });
                },
              }),
            ),
          );
      },
    });
    await expect(
      new AuthService(failing, new JwtService(), config).refresh(
        request(raw) as never,
        response() as never,
      ),
    ).rejects.toThrow("synthetic storage failure");
    expect(
      (await prisma.userSession.findUniqueOrThrow({ where: { id: previous.id } })).revokedAt,
    ).toBeNull();
    expect(await prisma.userSession.count({ where: { userId: user.id } })).toBe(1);
  });

  async function channel() {
    const pipeline = await prisma.pipeline.create({
      data: { organizationId, name: "Synthetic pipeline" },
    });
    const stage = await prisma.pipelineStage.create({
      data: { organizationId, pipelineId: pipeline.id, name: "New", isInitial: true },
    });
    const channel = await prisma.channel.create({
      data: {
        organizationId,
        name: "Synthetic channel",
        type: "WHATSAPP",
        provider: "fake",
        externalAccountId: randomUUID(),
      },
    });
    await prisma.pipelineChannelConnection.create({
      data: {
        organizationId,
        pipelineId: pipeline.id,
        channelId: channel.id,
        isDefault: true,
        defaultStageId: stage.id,
      },
    });
    return channel;
  }
  const event = (id: string, externalEventId: string) => ({
    kind: "inbound_message" as const,
    externalEventId,
    externalMessageId: id,
    phone: "5511999998899",
    contactName: "Synthetic person",
    body: "Fictitious test message",
    occurredAt: new Date(),
  });

  it("commits one message, deal and domain event across concurrent duplicate deliveries", async () => {
    const target = await channel();
    const id = randomUUID();
    const service = new ConnectionsInboundService(prisma);
    const other = new ConnectionsInboundService(prisma);
    const results = await Promise.all([
      service.process(target, event(id, "envelope-a")),
      other.process(target, event(id, "envelope-b")),
    ]);
    expect(results.filter((result) => "duplicate" in result && result.duplicate)).toHaveLength(1);
    expect(await prisma.providerEventReceipt.count({ where: { channelId: target.id } })).toBe(1);
    expect(await prisma.message.count({ where: { channelId: target.id } })).toBe(1);
    const conversation = await prisma.conversation.findFirstOrThrow({
      where: { channelId: target.id },
    });
    expect(conversation.unreadCount).toBe(1);
    expect(await prisma.deal.count({ where: { conversationId: conversation.id } })).toBe(1);
    expect(
      await prisma.automationDomainEvent.count({
        where: {
          organizationId,
          eventType: "message.received",
          payload: { path: ["channelId"], equals: target.id },
        },
      }),
    ).toBe(1);
  }, 30000);

  it("recognizes old timestamp-based receipts and allows a failed transaction to be retried", async () => {
    const target = await channel();
    const service = new ConnectionsInboundService(prisma);
    const id = randomUUID();
    await prisma.providerEventReceipt.create({
      data: {
        organizationId,
        channelId: target.id,
        externalEventId: "legacy-time",
        externalMessageId: id,
      },
    });
    expect(await service.process(target, event(id, "new-time"))).toEqual({
      accepted: true,
      duplicate: true,
    });
    expect(await prisma.message.count({ where: { channelId: target.id } })).toBe(0);
    const fresh = randomUUID();
    await prisma.pipelineChannelConnection.updateMany({
      where: { channelId: target.id },
      data: { active: false },
    });
    await expect(service.process(target, event(fresh, "retry-event"))).rejects.toThrow(
      "Connection has no active default pipeline",
    );
    expect(
      await prisma.providerEventReceipt.count({
        where: { channelId: target.id, externalEventId: "retry-event" },
      }),
    ).toBe(0);
    await prisma.pipelineChannelConnection.updateMany({
      where: { channelId: target.id },
      data: { active: true },
    });
    expect(await service.process(target, event(fresh, "retry-event"))).toEqual(
      expect.objectContaining({ accepted: true, duplicate: false }),
    );
  }, 30000);
});
