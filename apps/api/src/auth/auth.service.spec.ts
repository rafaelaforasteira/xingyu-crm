import { UnauthorizedException } from "@nestjs/common";
import { AuthRole, UserStatus } from "@xingyu/database";
import { AuthService } from "./auth.service";

function createService(overrides?: {
  prisma?: Partial<Record<string, unknown>>;
  jwt?: Partial<Record<string, unknown>>;
  config?: Partial<Record<string, unknown>>;
}) {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (ops: unknown[]) => ops),
    ...(overrides?.prisma ?? {}),
  };

  const jwt = {
    signAsync: jest.fn().mockResolvedValue("access.jwt"),
    verifyAsync: jest.fn(),
    ...(overrides?.jwt ?? {}),
  };

  const config = {
    getOrThrow: jest.fn((key: string) => {
      if (key === "JWT_ACCESS_SECRET") return "access-secret";
      if (key === "JWT_REFRESH_SECRET") return "refresh-secret";
      throw new Error(`missing ${key}`);
    }),
    ...(overrides?.config ?? {}),
  };

  const service = new AuthService(prisma as never, jwt as never, config as never);
  return { service, prisma, jwt, config };
}

function mockRes() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
}

function mockReq(extra?: Record<string, unknown>) {
  return {
    headers: { "user-agent": "jest" },
    ip: "127.0.0.1",
    cookies: {},
    ...extra,
  };
}

describe("AuthService", () => {
  it("normalizes email", () => {
    const { service } = createService();
    expect(service.normalizeEmail("  Admin@Xingyu.Local ")).toBe("admin@xingyu.local");
  });

  it("toPublicUser never exposes passwordHash", () => {
    const { service } = createService();
    const publicUser = service.toPublicUser({
      id: "u1",
      name: "Admin",
      email: "admin@xingyu.local",
      authRole: AuthRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    expect(publicUser).toEqual({
      id: "u1",
      name: "Admin",
      email: "admin@xingyu.local",
      role: AuthRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    expect(publicUser).not.toHaveProperty("passwordHash");
  });

  it("login succeeds and creates session", async () => {
    const { service, prisma, jwt } = createService();
    const hash = await service.hashPassword("ChangeMeNow123!");
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Administradora Xingyu",
      email: "admin@xingyu.local",
      authRole: AuthRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: hash,
    });
    prisma.userSession.create.mockResolvedValue({ id: "s1" });
    prisma.user.update.mockResolvedValue({});

    const res = mockRes();
    const result = await service.login(
      { email: "Admin@xingyu.local", password: "ChangeMeNow123!" },
      mockReq() as never,
      res as never,
    );

    expect(result.user.email).toBe("admin@xingyu.local");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(prisma.userSession.create).toHaveBeenCalled();
    expect(jwt.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: "u1", role: AuthRole.ADMIN, sessionId: "s1" }),
      expect.any(Object),
    );
    expect(res.cookie).toHaveBeenCalledTimes(2);
  });

  it("login rejects invalid password with generic message", async () => {
    const { service, prisma } = createService();
    const hash = await service.hashPassword("right-password");
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Admin",
      email: "admin@xingyu.local",
      authRole: AuthRole.ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: hash,
    });

    await expect(
      service.login(
        { email: "admin@xingyu.local", password: "wrong" },
        mockReq() as never,
        mockRes() as never,
      ),
    ).rejects.toThrow(UnauthorizedException);

    try {
      await service.login(
        { email: "admin@xingyu.local", password: "wrong" },
        mockReq() as never,
        mockRes() as never,
      );
    } catch (error) {
      expect((error as UnauthorizedException).message).toBe("E-mail ou senha inválidos.");
    }
  });

  it("login rejects missing email with same generic message", async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValue(null);

    try {
      await service.login(
        { email: "missing@xingyu.local", password: "whatever" },
        mockReq() as never,
        mockRes() as never,
      );
      fail("expected throw");
    } catch (error) {
      expect((error as UnauthorizedException).message).toBe("E-mail ou senha inválidos.");
    }
  });

  it("login rejects inactive user with generic message", async () => {
    const { service, prisma } = createService();
    const hash = await service.hashPassword("ChangeMeNow123!");
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Admin",
      email: "admin@xingyu.local",
      authRole: AuthRole.ADMIN,
      status: UserStatus.INACTIVE,
      passwordHash: hash,
    });

    try {
      await service.login(
        { email: "admin@xingyu.local", password: "ChangeMeNow123!" },
        mockReq() as never,
        mockRes() as never,
      );
      fail("expected throw");
    } catch (error) {
      expect((error as UnauthorizedException).message).toBe("E-mail ou senha inválidos.");
    }
  });

  it("refresh rotates token and revokes previous session", async () => {
    const { service, prisma } = createService();
    const raw = "refresh-token-value";
    const hash = service.hashRefreshToken(raw);

    prisma.userSession.findFirst.mockResolvedValue({
      id: "s-old",
      userId: "u1",
      refreshTokenHash: hash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      userAgent: "jest",
      ipAddress: "127.0.0.1",
      user: {
        id: "u1",
        name: "Admin",
        email: "admin@xingyu.local",
        authRole: AuthRole.ADMIN,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });
    prisma.userSession.update.mockResolvedValue({});
    prisma.userSession.create.mockResolvedValue({ id: "s-new" });
    prisma.userSession.findFirstOrThrow.mockResolvedValue({ id: "s-new" });

    const res = mockRes();
    const result = await service.refresh(
      mockReq({ cookies: { xingyu_refresh_token: raw } }) as never,
      res as never,
    );

    expect(result.user.role).toBe(AuthRole.ADMIN);
    expect(prisma.userSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s-old" },
        data: { revokedAt: expect.any(Date) },
      }),
    );
    expect(res.cookie).toHaveBeenCalled();
  });

  it("refresh rejects revoked token and revokes all sessions", async () => {
    const { service, prisma } = createService();
    const raw = "revoked-token";
    prisma.userSession.findFirst.mockResolvedValue({
      id: "s1",
      userId: "u1",
      refreshTokenHash: service.hashRefreshToken(raw),
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: {
        id: "u1",
        name: "Admin",
        email: "admin@xingyu.local",
        authRole: AuthRole.ADMIN,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });
    prisma.userSession.updateMany.mockResolvedValue({ count: 2 });

    const res = mockRes();
    await expect(
      service.refresh(
        mockReq({ cookies: { xingyu_refresh_token: raw } }) as never,
        res as never,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.userSession.updateMany).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();
  });

  it("refresh rejects expired session", async () => {
    const { service, prisma } = createService();
    const raw = "expired-token";
    prisma.userSession.findFirst.mockResolvedValue({
      id: "s1",
      userId: "u1",
      refreshTokenHash: service.hashRefreshToken(raw),
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user: {
        id: "u1",
        name: "Admin",
        email: "admin@xingyu.local",
        authRole: AuthRole.ADMIN,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });
    prisma.userSession.update.mockResolvedValue({});

    await expect(
      service.refresh(
        mockReq({ cookies: { xingyu_refresh_token: raw } }) as never,
        mockRes() as never,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("logout revokes session and clears cookies idempotently", async () => {
    const { service, prisma } = createService();
    const raw = "refresh";
    prisma.userSession.updateMany.mockResolvedValue({ count: 1 });
    const res = mockRes();

    await expect(
      service.logout(
        mockReq({ cookies: { xingyu_refresh_token: raw } }) as never,
        res as never,
      ),
    ).resolves.toEqual({ ok: true });

    await expect(
      service.logout(mockReq({ cookies: {} }) as never, res as never),
    ).resolves.toEqual({ ok: true });
  });

  it("me returns public user", async () => {
    const { service, prisma } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Admin",
      email: "admin@xingyu.local",
      authRole: AuthRole.MANAGER,
      status: UserStatus.ACTIVE,
    });
    const me = await service.me("u1");
    expect(me.role).toBe(AuthRole.MANAGER);
    expect(me).not.toHaveProperty("passwordHash");
  });
});
