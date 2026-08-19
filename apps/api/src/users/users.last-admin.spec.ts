import { BadRequestException } from "@nestjs/common";
import { AuthRole } from "@xingyu/database";
import { UsersService } from "./users.service";

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
    },
    userInvite: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
    userSession: { updateMany: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(prisma));
  return prisma;
}

describe("UsersService last-admin protection", () => {
  it("refuses to demote the last active admin", async () => {
    const prisma = prismaMock();
    prisma.user.findFirst.mockResolvedValue({ authRole: AuthRole.ADMIN });
    prisma.user.count.mockResolvedValue(1);
    const service = new UsersService(prisma, auth, config);
    await expect(
      service.update("org-1", "admin-1", { role: AuthRole.CONSULTANT } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("refuses to deactivate the last active admin", async () => {
    const prisma = prismaMock();
    prisma.user.findFirst.mockResolvedValue({
      id: "admin-1",
      authRole: AuthRole.ADMIN,
    });
    prisma.user.count.mockResolvedValue(1);
    const service = new UsersService(prisma, auth, config);
    await expect(service.setActive("org-1", "admin-1", false)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("allows deactivating an admin when another remains", async () => {
    const prisma = prismaMock();
    prisma.user.findFirst.mockResolvedValue({
      id: "admin-1",
      authRole: AuthRole.ADMIN,
    });
    prisma.user.count.mockResolvedValue(2);
    prisma.user.update.mockResolvedValue({});
    prisma.userSession.updateMany.mockResolvedValue({ count: 1 });
    const service = new UsersService(prisma, auth, config);
    await expect(service.setActive("org-1", "admin-1", false)).resolves.toEqual({
      id: "admin-1",
      status: "INACTIVE",
    });
  });

  it("strips passwordHash from listed users", async () => {
    const prisma = prismaMock();
    prisma.user.findMany = jest.fn().mockResolvedValue([
      {
        id: "u1",
        name: "Ana",
        email: "ana@example.com",
        passwordHash: "SHOULD-NOT-LEAK",
        sessions: [{ id: "s1" }],
        pipelineAccesses: [],
      },
    ]);
    prisma.user.count.mockResolvedValue(1);
    const service = new UsersService(prisma, auth, config);
    const result = await service.list("org-1", { page: 1, pageSize: 20 } as any);
    expect(result.data[0]).not.toHaveProperty("passwordHash");
    expect(result.data[0].activeSessions).toBe(1);
  });
});
