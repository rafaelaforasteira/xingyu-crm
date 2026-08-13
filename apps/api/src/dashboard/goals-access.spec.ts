import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AuthRole, GoalMetric, GoalScope } from "@xingyu/database";
import type { AuthenticatedUser } from "../auth/types";
import { GoalsService } from "./goals.service";

const consultant = {
  id: "user-a",
  organizationId: "org-a",
  role: AuthRole.CONSULTANT,
  teamId: "team-a",
} as AuthenticatedUser;
const manager = { ...consultant, id: "manager-a", role: AuthRole.MANAGER } as AuthenticatedUser;
const admin = { ...consultant, id: "admin-a", role: AuthRole.ADMIN } as AuthenticatedUser;
const input = {
  metric: GoalMetric.REVENUE,
  scope: GoalScope.USER,
  userId: "user-a",
  targetValue: "1000.00",
  periodStart: "2026-08-01T00:00:00.000Z",
  periodEnd: "2026-09-01T00:00:00.000Z",
};

function prismaMock() {
  return {
    goal: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn(), create: jest.fn() },
    user: { count: jest.fn().mockResolvedValue(1) },
    team: { count: jest.fn().mockResolvedValue(1) },
    pipeline: { count: jest.fn().mockResolvedValue(1) },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn((callback) =>
      callback({
        goal: { create: jest.fn().mockResolvedValue({ id: "goal-a" }) },
        auditLog: { create: jest.fn() },
      }),
    ),
  } as any;
}

describe("Goals ACL and history rules", () => {
  it("limits a consultant list to organization, own team and own goals", async () => {
    const prisma = prismaMock();
    await new GoalsService(prisma).list("org-a", consultant, {});
    expect(prisma.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-a",
          OR: [
            { scope: GoalScope.ORGANIZATION },
            { scope: GoalScope.TEAM, teamId: "team-a" },
            { scope: GoalScope.USER, userId: "user-a" },
          ],
        }),
      }),
    );
  });

  it("rejects organization goal management by a manager", async () => {
    const service = new GoalsService(prismaMock());
    await expect(
      service.create(
        "org-a",
        manager,
        { ...input, scope: GoalScope.ORGANIZATION, userId: undefined },
        ["pipeline-a"],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects an overlapping historical goal", async () => {
    const prisma = prismaMock();
    prisma.goal.count.mockResolvedValue(1);
    await expect(
      new GoalsService(prisma).create("org-a", admin, input, null),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
