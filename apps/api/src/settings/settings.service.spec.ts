import { BadRequestException } from "@nestjs/common";
import { AuthRole } from "@xingyu/database";
import { SettingsService } from "./settings.service";

function prismaMock() {
  return {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  } as any;
}

describe("SettingsService user surface", () => {
  it("lists users without passwordHash in the query shape", async () => {
    const prisma = prismaMock();
    prisma.user.findMany.mockResolvedValue([
      { id: "u1", name: "Ana", email: "ana@org.local", authRole: "CONSULTANT" },
    ]);
    prisma.user.count.mockResolvedValue(1);
    const service = new SettingsService(prisma);
    await service.listUsers("org-1", { page: 1, pageSize: 20 } as any);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ id: true, email: true }),
      }),
    );
    expect(prisma.user.findMany.mock.calls[0][0].select.passwordHash).toBeUndefined();
  });

  it("does not persist passwordHash or organizationId from the DTO", async () => {
    const prisma = prismaMock();
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      authRole: AuthRole.CONSULTANT,
      status: "ACTIVE",
    });
    prisma.user.update.mockResolvedValue({ id: "u1", name: "Ana" });
    const service = new SettingsService(prisma);
    await service.updateUser("org-1", "u1", {
      name: "Ana",
      passwordHash: "hack",
      organizationId: "org-b",
    } as any);
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.passwordHash).toBeUndefined();
    expect(data.organizationId).toBeUndefined();
    expect(data.name).toBe("Ana");
  });

  it("blocks demoting the last admin through settings/users", async () => {
    const prisma = prismaMock();
    prisma.user.findFirst.mockResolvedValue({
      id: "admin-1",
      authRole: AuthRole.ADMIN,
      status: "ACTIVE",
    });
    prisma.user.count.mockResolvedValue(1);
    const service = new SettingsService(prisma);
    await expect(
      service.updateUser("org-1", "admin-1", { role: "CONSULTANT" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
