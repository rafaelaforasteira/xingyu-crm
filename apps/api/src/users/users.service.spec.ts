import { BadRequestException, ConflictException } from "@nestjs/common";
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

describe("UsersService invitations", () => {
  it("creates an invited user and persists only the token hash", async () => {
    const prisma = prismaMock();
    prisma.user.create.mockResolvedValue({
      id: "u2",
      name: "Ana",
      email: "ana@example.com",
      status: "INVITED",
    });
    const service = new UsersService(prisma, auth, config);
    const result = await service.invite("org-1", "admin-1", {
      name: "Ana",
      email: " ANA@example.com ",
      role: "CONSULTANT",
    } as any);
    const inviteData = prisma.userInvite.create.mock.calls[0][0].data;
    expect(inviteData.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.inviteUrl).toContain("/accept-invite?token=");
    expect(result.inviteUrl).not.toContain(inviteData.tokenHash);
  });

  it("does not disclose whether an existing account can be invited by creating a duplicate", async () => {
    const prisma = prismaMock();
    prisma.user.count.mockResolvedValue(1);
    const service = new UsersService(prisma, auth, config);
    await expect(
      service.invite("org-1", "admin-1", {
        name: "Ana",
        email: "ana@example.com",
        role: "CONSULTANT",
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects expired invitations", async () => {
    const prisma = prismaMock();
    prisma.userInvite.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() - 1),
      usedAt: null,
      revokedAt: null,
      user: { status: "INVITED" },
    });
    const service = new UsersService(prisma, auth, config);
    await expect(service.inspectInvite("expired-token")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("atomically claims a single-use invitation before activating the user", async () => {
    const prisma = prismaMock();
    prisma.userInvite.findUnique.mockResolvedValue({
      id: "i1",
      userId: "u2",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      revokedAt: null,
      user: { status: "INVITED" },
    });
    prisma.userInvite.updateMany.mockResolvedValue({ count: 1 });
    const service = new UsersService(prisma, auth, config);
    await expect(
      service.acceptInvite("token", "strong-password", "strong-password"),
    ).resolves.toEqual({ ok: true });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: "argon-hash", status: "ACTIVE" } }),
    );
  });
});
