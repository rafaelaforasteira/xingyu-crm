import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { SettingsService } from "./settings.service";

function prismaMock() {
  const prisma: any = {
    team: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  prisma.$transaction = jest.fn(async (callback: (tx: any) => unknown) => callback(prisma));
  return prisma;
}

describe("SettingsService teams", () => {
  it("lists teams with member preview without extra per-team queries", async () => {
    const prisma = prismaMock();
    prisma.team.findMany.mockResolvedValue([
      { id: "t1", name: "Comercial", description: "Vendas", _count: { members: 2 } },
    ]);
    prisma.team.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      { id: "u1", name: "Ana", avatarUrl: null, teamId: "t1" },
      { id: "u2", name: "Bia", avatarUrl: "x.png", teamId: "t1" },
    ]);
    const service = new SettingsService(prisma);
    const result = await service.listTeams("org-1", { page: 1, pageSize: 20 } as any);
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(result.data[0].memberCount).toBe(2);
    expect(result.data[0].memberPreview).toHaveLength(2);
  });

  it("rejects duplicate team names case-insensitively", async () => {
    const prisma = prismaMock();
    prisma.team.findFirst.mockResolvedValue({ id: "t-existing" });
    const service = new SettingsService(prisma);
    await expect(service.createTeam("org-1", { name: "comercial" } as any)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.team.create).not.toHaveBeenCalled();
  });

  it("rejects adding a user from another organization", async () => {
    const prisma = prismaMock();
    prisma.team.findFirst.mockResolvedValue({ id: "t1" });
    prisma.user.findMany.mockResolvedValue([{ id: "u1", status: "ACTIVE", teamId: null }]);
    const service = new SettingsService(prisma);
    await expect(service.addTeamMembers("org-1", "t1", ["u1", "u-other"])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("rejects inactive users in member updates", async () => {
    const prisma = prismaMock();
    prisma.team.findFirst.mockResolvedValue({ id: "t1" });
    prisma.user.findMany.mockResolvedValue([{ id: "u1", status: "INACTIVE", teamId: null }]);
    const service = new SettingsService(prisma);
    await expect(service.addTeamMembers("org-1", "t1", ["u1"])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("replaces members in a transaction (detach missing, add selected)", async () => {
    const prisma = prismaMock();
    prisma.team.findFirst.mockResolvedValue({ id: "t1" });
    prisma.user.findMany.mockResolvedValue([
      { id: "u1", status: "ACTIVE", teamId: null },
      { id: "u2", status: "INVITED", teamId: "t2" },
    ]);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    const service = new SettingsService(prisma);
    await service.replaceTeamMembers("org-1", "t1", ["u1", "u2"]);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.user.updateMany).toHaveBeenCalledTimes(2);
  });

  it("archives an empty team with detach", async () => {
    const prisma = prismaMock();
    prisma.team.findFirst.mockResolvedValue({ id: "t1", name: "X" });
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    prisma.team.update.mockResolvedValue({ id: "t1" });
    const service = new SettingsService(prisma);
    await expect(service.archiveTeam("org-1", "t1", { memberAction: "detach" })).resolves.toEqual({
      id: "t1",
      archived: true,
    });
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it("moves members before archiving", async () => {
    const prisma = prismaMock();
    prisma.team.findFirst
      .mockResolvedValueOnce({ id: "t1", name: "Old" })
      .mockResolvedValueOnce({ id: "t2" });
    prisma.user.updateMany.mockResolvedValue({ count: 3 });
    prisma.team.update.mockResolvedValue({ id: "t1" });
    const service = new SettingsService(prisma);
    await service.archiveTeam("org-1", "t1", { memberAction: "move", targetTeamId: "t2" });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1", teamId: "t1", deletedAt: null },
      data: { teamId: "t2" },
    });
  });

  it("does not archive a team from another organization", async () => {
    const prisma = prismaMock();
    prisma.team.findFirst.mockResolvedValue(null);
    const service = new SettingsService(prisma);
    await expect(service.archiveTeam("org-1", "team-org-b")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.team.update).not.toHaveBeenCalled();
  });
});
