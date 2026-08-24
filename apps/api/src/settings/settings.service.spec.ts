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

  it("profile update ignores role, organizationId and passwordHash", async () => {
    const prisma = prismaMock();
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Ana",
      email: "ana@org.local",
    });
    prisma.user.update.mockResolvedValue({ id: "u1", name: "Ana Silva" });
    const service = new SettingsService(prisma);
    await service.updateProfile("org-1", "u1", {
      name: "Ana Silva",
      role: "ADMIN",
      organizationId: "org-b",
      passwordHash: "hack",
    } as any);
    const data = prisma.user.update.mock.calls[0][0].data;
    expect(data.name).toBe("Ana Silva");
    expect(data.authRole).toBeUndefined();
    expect(data.organizationId).toBeUndefined();
    expect(data.passwordHash).toBeUndefined();
  });

  it("uploadAvatar rejects non-image mime before persist", async () => {
    const prisma = prismaMock();
    prisma.user.findFirst.mockResolvedValue({
      id: "u1",
      name: "Ana",
      email: "ana@org.local",
    });
    const service = new SettingsService(prisma);
    await expect(
      service.uploadAvatar("org-1", "u1", {
        mimetype: "application/pdf",
        size: 100,
        originalname: "x.pdf",
        buffer: Buffer.from("%PDF"),
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
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
