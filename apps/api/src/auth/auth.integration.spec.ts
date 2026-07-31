import {
  CanActivate,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthRole, UserStatus } from "@xingyu/database";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./guards/auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { PrismaService } from "../prisma/prisma.service";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { Controller, Get } from "@nestjs/common";
import { Public } from "./decorators/public.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AuthenticatedUser } from "./types";

@Controller("probe")
class ProbeController {
  @Get("private")
  privateRoute(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, role: user.role, id: user.id };
  }

  @Public()
  @Get("public")
  publicRoute() {
    return { ok: true };
  }
}

class AllowAllThrottler implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

describe("Auth HTTP flows (integration)", () => {
  let app: INestApplication;
  let auth: AuthService;
  let prisma: {
    user: { findFirst: jest.Mock; update: jest.Mock };
    userSession: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findFirstOrThrow: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeAll(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      userSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (ops: unknown[]) => ops),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }]),
      ],
      controllers: [AuthController, ProbeController],
      providers: [
        AuthService,
        AuthGuard,
        RolesGuard,
        JwtService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === "JWT_ACCESS_SECRET") return "test-access-secret";
              if (key === "JWT_REFRESH_SECRET") return "test-refresh-secret";
              throw new Error(key);
            },
            get: () => undefined,
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: APP_GUARD, useClass: AllowAllThrottler },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: ThrottlerGuard, useClass: AllowAllThrottler },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    auth = moduleRef.get(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /auth/login valid + GET /auth/me authenticated", async () => {
    const passwordHash = await auth.hashPassword("ChangeMeNow123!");
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Administradora Xingyu",
      email: "admin@xingyu.local",
      authRole: AuthRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
      organizationId: "org-xingyu",
      teamId: "team-gestao",
      team: { name: "Gestão" },
      deletedAt: null,
    });
    prisma.userSession.create.mockResolvedValue({ id: "sess-1" });
    prisma.user.update.mockResolvedValue({});
    prisma.userSession.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "u1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "admin@xingyu.local", password: "ChangeMeNow123!" })
      .expect(200);

    expect(login.body.user.role).toBe("ADMIN");
    expect(login.body.user).not.toHaveProperty("passwordHash");
    expect(login.headers["set-cookie"]).toEqual(
      expect.arrayContaining([
        expect.stringContaining("xingyu_access_token="),
        expect.stringContaining("xingyu_refresh_token="),
      ]),
    );

    const cookies = (login.headers["set-cookie"] ?? []) as unknown as string[];
    const me = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", cookies)
      .expect(200);

    expect(me.body.email).toBe("admin@xingyu.local");
    expect(me.body).not.toHaveProperty("passwordHash");
  });

  it("GET /auth/me without session returns 401", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
  });

  it("protected route without auth returns 401", async () => {
    await request(app.getHttpServer()).get("/api/probe/private").expect(401);
  });

  it("@Public allows access", async () => {
    await request(app.getHttpServer()).get("/api/probe/public").expect(200);
  });

  it("role is attached to authenticated user on protected route", async () => {
    const passwordHash = await auth.hashPassword("ChangeMeNow123!");
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Gestora",
      email: "manager@xingyu.local",
      authRole: AuthRole.MANAGER,
      status: UserStatus.ACTIVE,
      passwordHash,
      organizationId: "org-xingyu",
      teamId: "team-comercial",
      team: { name: "Comercial" },
      deletedAt: null,
    });
    prisma.userSession.create.mockResolvedValue({ id: "sess-2" });
    prisma.user.update.mockResolvedValue({});
    prisma.userSession.findUnique.mockResolvedValue({
      id: "sess-2",
      userId: "u1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const login = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "manager@xingyu.local", password: "ChangeMeNow123!" })
      .expect(200);

    const cookies = (login.headers["set-cookie"] ?? []) as unknown as string[];
    const probe = await request(app.getHttpServer())
      .get("/api/probe/private")
      .set("Cookie", cookies)
      .expect(200);

    expect(probe.body.role).toBe("MANAGER");
  });

  it("login invalid credentials do not leak existence", async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const missing = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "nope@xingyu.local", password: "whatever123" })
      .expect(401);

    const passwordHash = await auth.hashPassword("right");
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Admin",
      email: "admin@xingyu.local",
      authRole: AuthRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash,
    });
    const wrong = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "admin@xingyu.local", password: "wrong-password" })
      .expect(401);

    expect(missing.body.message).toEqual(wrong.body.message);
  });
});
