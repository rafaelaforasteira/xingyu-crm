import { INestApplication, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { APP_GUARD } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { PipelineAccessService } from "../../pipelines/pipeline-access.service";
import { UploadsController } from "./uploads.controller";
import { UploadsService } from "./uploads.service";
import { validateAndSaveUpload } from "./upload.util";
import { ConversationsController } from "../../conversations/conversations.controller";
import { ConversationsService } from "../../conversations/conversations.service";
import { TasksController } from "../../tasks/tasks.controller";
import { TasksService } from "../../tasks/tasks.service";
import { OrdersController } from "../../orders/orders.controller";
import { OrdersService } from "../../orders/orders.service";
import { SettingsController } from "../../settings/settings.controller";
import { SettingsService } from "../../settings/settings.service";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import cookieParser from "cookie-parser";
import request from "supertest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("private upload download HTTP", () => {
  let app: INestApplication;
  let root: string;
  const previous = process.env.UPLOAD_DIR;
  let role = "ADMIN";
  const access = {
    assertConversationAccess: jest.fn(),
    assertTaskAccess: jest.fn(),
    assertOrderAccess: jest.fn(),
    assertDealAccess: jest.fn(),
  };
  const prisma = {
    user: { findFirst: jest.fn() },
    userSession: { findUnique: jest.fn() },
    messageAttachment: { findFirst: jest.fn() },
    taskCommentAttachment: { findFirst: jest.fn() },
    payment: { findFirst: jest.fn() },
    leadFile: { findFirst: jest.fn() },
  };
  const cookie = "xingyu_access_token=test-token";
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  const sinks = {
    sendMessage: jest.fn((_org, _id, _dto, _user, files) => files.map(validateAndSaveUpload)),
    createComment: jest.fn((_org, _id, _user, _dto, files) => files.map(validateAndSaveUpload)),
    uploadPaymentReceipt: jest.fn((_org, _order, _payment, file) => validateAndSaveUpload(file)),
    uploadAvatar: jest.fn((_org, _user, file) => validateAndSaveUpload(file)),
  };
  const ingress = [
    ["/api/conversations/conversation-a/messages", "files"],
    ["/api/tasks/task-a/comments", "files"],
    ["/api/orders/order-a/payments/payment-a/receipt", "file"],
    ["/api/settings/profile/avatar", "file"],
  ];

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "brainx-private-"));
    process.env.UPLOAD_DIR = root;
    fs.writeFileSync(path.join(root, "message.txt"), "private fixture");
    fs.writeFileSync(path.join(root, "avatar.png"), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const module = await Test.createTestingModule({
      controllers: [
        UploadsController,
        ConversationsController,
        TasksController,
        OrdersController,
        SettingsController,
      ],
      providers: [
        UploadsService,
        { provide: ConversationsService, useValue: sinks },
        { provide: TasksService, useValue: sinks },
        { provide: OrdersService, useValue: sinks },
        { provide: SettingsService, useValue: sinks },
        { provide: PrismaService, useValue: prisma },
        { provide: PipelineAccessService, useValue: access },
        {
          provide: JwtService,
          useValue: { verifyAsync: async () => ({ sub: "u1", sessionId: "s1", role }) },
        },
        { provide: ConfigService, useValue: { getOrThrow: () => "test-only-secret" } },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api");
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    if (previous === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previous;
    fs.rmSync(root, { recursive: true, force: true });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    for (const mock of Object.values(access)) mock.mockReset();
    for (const delegate of Object.values(prisma))
      for (const mock of Object.values(delegate)) mock.mockReset();
    role = "ADMIN";
    prisma.userSession.findUnique.mockResolvedValue({
      id: "s1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60000),
      revokedAt: null,
    });
    prisma.user.findFirst.mockImplementation(async ({ where }) =>
      where.avatarUrl
        ? null
        : {
            id: "u1",
            name: "Test",
            email: "test@example.invalid",
            authRole: role,
            status: "ACTIVE",
            organizationId: "org-a",
            teamId: null,
            team: null,
          },
    );
    prisma.messageAttachment.findFirst.mockImplementation(async ({ where }) =>
      where.url === "/api/uploads/files/message.txt" &&
      where.message.conversation.organizationId === "org-a"
        ? {
            mimeType: "text/plain",
            fileName: "private.txt",
            message: { conversationId: "conversation-a" },
          }
        : null,
    );
  });
  it.each(ingress)("requires a session for multipart ingress %s", async (url, field) => {
    await request(app.getHttpServer()).post(url).attach(field, png, "file.png").expect(401);
    for (const sink of Object.values(sinks)) expect(sink).not.toHaveBeenCalled();
  });
  it.each(ingress)("validates content before storage at %s", async (url, field) => {
    const count = fs.readdirSync(root).length;
    await request(app.getHttpServer())
      .post(url)
      .set("Cookie", cookie)
      .attach(field, Buffer.from("<script>test</script>"), {
        filename: "spoof.png",
        contentType: "image/png",
      })
      .expect(400);
    expect(fs.readdirSync(root)).toHaveLength(count);
  });
  it.each(ingress.slice(0, 3))(
    "checks resource authorization before storing at %s",
    async (url, field) => {
      for (const mock of Object.values(access)) mock.mockRejectedValue(new NotFoundException());
      await request(app.getHttpServer())
        .post(url)
        .set("Cookie", cookie)
        .attach(field, png, "file.png")
        .expect(404);
      for (const sink of Object.values(sinks)) expect(sink).not.toHaveBeenCalled();
    },
  );
  it("binds avatar upload to the authenticated user and organization", async () => {
    await request(app.getHttpServer())
      .post("/api/settings/profile/avatar")
      .set("Cookie", cookie)
      .set("X-Organization-Id", "org-b")
      .field("userId", "u2")
      .attach("file", png, "file.png")
      .expect(201);
    expect(sinks.uploadAvatar).toHaveBeenCalledWith(
      "org-a",
      "u1",
      expect.objectContaining({ originalname: "file.png" }),
    );
  });
  it("enforces the 5MB avatar transport limit and the attachment count limit", async () => {
    await request(app.getHttpServer())
      .post("/api/settings/profile/avatar")
      .set("Cookie", cookie)
      .attach("file", Buffer.alloc(5 * 1024 * 1024 + 1), "large.png")
      .expect(413);
    let upload = request(app.getHttpServer())
      .post("/api/conversations/conversation-a/messages")
      .set("Cookie", cookie);
    for (let i = 0; i < 11; i++) upload = upload.attach("files", png, `image-${i}.png`);
    await upload.expect(400);
    expect(sinks.sendMessage).not.toHaveBeenCalled();
    expect(sinks.uploadAvatar).not.toHaveBeenCalled();
  });
  it("requires authentication even when the URL is known", async () => {
    await request(app.getHttpServer()).get("/api/uploads/files/message.txt").expect(401);
    expect(prisma.messageAttachment.findFirst).not.toHaveBeenCalled();
    await request(app.getHttpServer()).head("/api/uploads/files/message.txt").expect(401);
  });
  it("streams an authorized file with restrictive headers", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/uploads/files/message.txt")
      .set("Cookie", cookie)
      .expect(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers["content-disposition"]).toMatch(/^attachment/);
    expect(access.assertConversationAccess).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-a" }),
      "conversation-a",
    );
  });
  it("does not accept a tenant header as authorization", async () => {
    prisma.messageAttachment.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get("/api/uploads/files/message.txt")
      .set("Cookie", cookie)
      .set("X-Organization-Id", "org-b")
      .expect(404);
    expect(prisma.messageAttachment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          message: expect.objectContaining({
            conversation: expect.objectContaining({ organizationId: "org-a" }),
          }),
        }),
      }),
    );
  });
  it("denies revoked sessions and resource-level denial", async () => {
    prisma.userSession.findUnique.mockResolvedValue({
      id: "s1",
      userId: "u1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    });
    await request(app.getHttpServer())
      .get("/api/uploads/files/message.txt")
      .set("Cookie", cookie)
      .expect(401);
    prisma.userSession.findUnique.mockResolvedValue({
      id: "s1",
      userId: "u1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60000),
    });
    access.assertConversationAccess.mockRejectedValue(new NotFoundException());
    await request(app.getHttpServer())
      .get("/api/uploads/files/message.txt")
      .set("Cookie", cookie)
      .expect(404);
  });
  it("allows a colleague avatar but does not reopen business files to restricted roles", async () => {
    role = "CONSULTANT";
    prisma.user.findFirst.mockImplementation(async ({ where }) =>
      where.avatarUrl
        ? { id: "u2" }
        : {
            id: "u1",
            name: "Test",
            email: "test@example.invalid",
            authRole: role,
            status: "ACTIVE",
            organizationId: "org-a",
            teamId: null,
            team: null,
          },
    );
    await request(app.getHttpServer())
      .get("/api/uploads/files/avatar.png")
      .set("Cookie", cookie)
      .expect(200);
    prisma.user.findFirst.mockImplementation(async ({ where }) =>
      where.avatarUrl
        ? null
        : {
            id: "u1",
            name: "Test",
            email: "test@example.invalid",
            authRole: role,
            status: "ACTIVE",
            organizationId: "org-a",
            teamId: null,
            team: null,
          },
    );
    await request(app.getHttpServer())
      .get("/api/uploads/files/message.txt")
      .set("Cookie", cookie)
      .expect(404);
  });
  it.each(["missing.txt", "file.txt:ads", "nested/../file.txt", "%2e%2e%5csecret.txt"])(
    "rejects unlinked or unsafe path %s",
    async (name) => {
      await request(app.getHttpServer())
        .get("/api/uploads/files/" + name)
        .set("Cookie", cookie)
        .expect(404);
    },
  );
  it("checks task, payment and curated deal references", async () => {
    prisma.messageAttachment.findFirst.mockResolvedValue(null);
    prisma.taskCommentAttachment.findFirst.mockResolvedValue({
      mimeType: "text/plain",
      fileName: "task.txt",
      comment: { taskId: "task-a" },
    });
    await request(app.getHttpServer())
      .get("/api/uploads/files/message.txt")
      .set("Cookie", cookie)
      .expect(200);
    expect(access.assertTaskAccess).toHaveBeenCalled();
    prisma.taskCommentAttachment.findFirst.mockResolvedValue(null);
    prisma.payment.findFirst.mockResolvedValue({ orderId: "order-a" });
    await request(app.getHttpServer())
      .get("/api/uploads/files/message.txt")
      .set("Cookie", cookie)
      .expect(200);
    expect(access.assertOrderAccess).toHaveBeenCalled();
    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.leadFile.findFirst.mockResolvedValue({
      dealId: "deal-a",
      fileName: "lead.txt",
      mimeType: "text/plain",
    });
    await request(app.getHttpServer())
      .get("/api/uploads/files/message.txt")
      .set("Cookie", cookie)
      .expect(200);
    expect(access.assertDealAccess).toHaveBeenCalled();
  });
  it("rejects a storage symlink escaping the configured root", async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "brainx-outside-"));
    const link = path.join(root, "outside");
    fs.writeFileSync(path.join(outside, "secret.txt"), "outside fixture");
    try {
      fs.symlinkSync(outside, link, "junction");
      prisma.messageAttachment.findFirst.mockResolvedValue({
        mimeType: "text/plain",
        fileName: "secret.txt",
        message: { conversationId: "conversation-a" },
      });
      await request(app.getHttpServer())
        .get("/api/uploads/files/outside/secret.txt")
        .set("Cookie", cookie)
        .expect(404);
    } finally {
      if (fs.existsSync(link)) fs.unlinkSync(link);
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});
