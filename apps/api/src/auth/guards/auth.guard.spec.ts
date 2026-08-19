import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthRole, UserStatus } from "@xingyu/database";
import { AuthGuard } from "./auth.guard";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AUTH_COOKIE } from "../cookie.config";

function context(request: Record<string, unknown>) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
}

function createGuard(overrides?: {
  public?: boolean;
  jwt?: Partial<{ verifyAsync: jest.Mock }>;
  prisma?: Partial<Record<string, any>>;
}) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) =>
      key === IS_PUBLIC_KEY ? Boolean(overrides?.public) : undefined,
    ),
  };
  const jwt = {
    verifyAsync: jest.fn(),
    ...overrides?.jwt,
  };
  const config = {
    getOrThrow: jest.fn(() => "test-access-secret"),
  };
  const prisma = {
    userSession: { findUnique: jest.fn() },
    user: { findFirst: jest.fn() },
    ...overrides?.prisma,
  };
  const guard = new AuthGuard(
    reflector as never,
    jwt as never,
    config as never,
    prisma as never,
  );
  return { guard, jwt, prisma };
}

describe("AuthGuard", () => {
  it("allows @Public routes without a cookie", async () => {
    const { guard } = createGuard({ public: true });
    await expect(guard.canActivate(context({ cookies: {} }))).resolves.toBe(true);
  });

  it("rejects missing access cookie", async () => {
    const { guard } = createGuard();
    await expect(guard.canActivate(context({ cookies: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects a tampered JWT", async () => {
    const { guard, jwt } = createGuard();
    jwt.verifyAsync.mockRejectedValue(new Error("invalid signature"));
    await expect(
      guard.canActivate(
        context({ cookies: { [AUTH_COOKIE.access]: "tampered.jwt" } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a revoked session", async () => {
    const { guard, jwt, prisma } = createGuard();
    jwt.verifyAsync.mockResolvedValue({
      sub: "u1",
      role: AuthRole.ADMIN,
      sessionId: "s1",
    });
    prisma.userSession.findUnique.mockResolvedValue({
      id: "s1",
      userId: "u1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      guard.canActivate(context({ cookies: { [AUTH_COOKIE.access]: "ok.jwt" } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an inactive user even with a valid session", async () => {
    const { guard, jwt, prisma } = createGuard();
    jwt.verifyAsync.mockResolvedValue({
      sub: "u1",
      role: AuthRole.CONSULTANT,
      sessionId: "s1",
    });
    prisma.userSession.findUnique.mockResolvedValue({
      id: "s1",
      userId: "u1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Ana",
      email: "ana@org.local",
      authRole: AuthRole.CONSULTANT,
      status: UserStatus.INACTIVE,
      organizationId: "org-a",
      teamId: null,
      team: null,
    });
    await expect(
      guard.canActivate(context({ cookies: { [AUTH_COOKIE.access]: "ok.jwt" } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("binds organizationId from the user row, not from the client", async () => {
    const { guard, jwt, prisma } = createGuard();
    jwt.verifyAsync.mockResolvedValue({
      sub: "u1",
      role: AuthRole.ADMIN,
      sessionId: "s1",
    });
    prisma.userSession.findUnique.mockResolvedValue({
      id: "s1",
      userId: "u1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Admin",
      email: "admin@org-a.local",
      authRole: AuthRole.ADMIN,
      status: UserStatus.ACTIVE,
      organizationId: "org-a",
      teamId: "team-a",
      team: { name: "Gestão" },
    });
    const request: Record<string, unknown> = {
      cookies: { [AUTH_COOKIE.access]: "ok.jwt" },
      headers: { "x-organization-id": "org-b" },
      query: { organizationId: "org-b" },
    };
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect((request as { organizationId?: string }).organizationId).toBe("org-a");
  });
});
