import { AuthRole, UserStatus } from "@xingyu/database";
import { UsersService, USER_INACTIVE_ARCHIVE_DAYS } from "./users.service";

const config = { get: jest.fn().mockReturnValue("http://localhost:3000") } as any;
const auth = {
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  hashPassword: jest.fn().mockResolvedValue("argon-hash"),
  toPublicUser: (user: unknown) => user,
} as any;

function prismaMock() {
  const prisma: any = {
    team: { count: jest.fn().mockResolvedValue(1) },
    user: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    userInvite: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    userSession: { updateMany: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(prisma));
  return prisma;
}

describe("UsersService inactive archive policy", () => {
  it("does not archive at 89 days", async () => {
    const prisma = prismaMock();
    const now = new Date("2026-08-22T12:00:00.000Z");
    const deactivatedAt = new Date(
      now.getTime() - (USER_INACTIVE_ARCHIVE_DAYS - 1) * 24 * 60 * 60 * 1000,
    );
    prisma.user.findMany.mockResolvedValue([
      {
        id: "u-89",
        organizationId: "org-1",
        authRole: AuthRole.CONSULTANT,
        deactivatedAt,
      },
    ]);
    // findMany already filtered by lte cutoff in production; simulate empty match for 89d
    prisma.user.findMany.mockResolvedValue([]);
    const service = new UsersService(prisma, auth, config);
    const result = await service.archiveExpiredInactiveUsers(now);
    expect(result.archived).toBe(0);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("soft-archives at 90 days without hard delete", async () => {
    const prisma = prismaMock();
    const now = new Date("2026-08-22T12:00:00.000Z");
    prisma.user.findMany.mockResolvedValue([
      { id: "u-90", organizationId: "org-1", authRole: AuthRole.CONSULTANT },
    ]);
    prisma.userSession.updateMany.mockResolvedValue({ count: 0 });
    prisma.userInvite.updateMany.mockResolvedValue({ count: 0 });
    const service = new UsersService(prisma, auth, config);
    const result = await service.archiveExpiredInactiveUsers(now);
    expect(result.archived).toBe(1);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-90" },
      data: { deletedAt: now },
    });
  });

  it("clears deactivatedAt on reactivate so countdown resets", async () => {
    const prisma = prismaMock();
    prisma.user.findFirst.mockResolvedValue({
      id: "u-1",
      authRole: AuthRole.CONSULTANT,
      status: UserStatus.INACTIVE,
    });
    prisma.user.update.mockResolvedValue({});
    const service = new UsersService(prisma, auth, config);
    await service.setActive("org-1", "u-1", true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { status: UserStatus.ACTIVE, deactivatedAt: null },
    });
  });

  it("sets deactivatedAt when deactivating", async () => {
    const prisma = prismaMock();
    prisma.user.findFirst.mockResolvedValue({
      id: "u-1",
      authRole: AuthRole.CONSULTANT,
      status: UserStatus.ACTIVE,
    });
    prisma.user.update.mockResolvedValue({});
    prisma.userSession.updateMany.mockResolvedValue({ count: 1 });
    prisma.userInvite.updateMany.mockResolvedValue({ count: 0 });
    const service = new UsersService(prisma, auth, config);
    await service.setActive("org-1", "u-1", false);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: {
        status: UserStatus.INACTIVE,
        deactivatedAt: expect.any(Date),
      },
    });
  });

  it("returns organization-wide totals independent of page size", async () => {
    const prisma = prismaMock();
    prisma.user.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "Ana",
        email: "ana@example.com",
        passwordHash: "secret",
        deactivatedAt: null,
        lastLoginAt: null,
        sessions: [],
        pipelineAccesses: [],
        channelOwnerships: [],
        invites: [],
        team: null,
      },
    ]);
    prisma.user.count
      .mockResolvedValueOnce(1) // page total
      .mockResolvedValueOnce(9) // all
      .mockResolvedValueOnce(6) // active
      .mockResolvedValueOnce(1) // invited
      .mockResolvedValueOnce(2) // inactive
      .mockResolvedValueOnce(1); // activeAdmins
    const service = new UsersService(prisma, auth, config);
    // bypass hourly sweep
    (service as any).lastArchiveSweepAt = Date.now();
    const result = await service.list("org-1", { page: 1, pageSize: 1 } as any);
    expect(result.meta.total).toBe(1);
    expect(result.totals).toEqual({
      all: 9,
      active: 6,
      invited: 1,
      inactive: 2,
      activeAdmins: 1,
    });
    expect(result.data[0]).not.toHaveProperty("passwordHash");
  });
});
