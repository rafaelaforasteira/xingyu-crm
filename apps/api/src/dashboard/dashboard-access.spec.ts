import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types";
import { DashboardService } from "./dashboard.service";

const consultant = {
  id: "user-a",
  organizationId: "org-a",
  role: "CONSULTANT",
  teamId: "team-a",
} as AuthenticatedUser;

function prismaMock() {
  return {
    user: { count: jest.fn() },
    team: { count: jest.fn() },
    channel: { findFirst: jest.fn() },
  } as any;
}

describe("Dashboard filter authorization", () => {
  it("forces a consultant to their own commercial ownership", async () => {
    const service = new DashboardService(prismaMock());
    const result = await service.authorizeFilters("org-a", consultant, { period: "30d" }, [
      "pipeline-a",
    ]);
    expect(result).toMatchObject({
      ownerId: "user-a",
      viewerRole: "CONSULTANT",
      allowedPipelineIds: ["pipeline-a"],
    });
  });

  it("rejects a pipeline outside effective Pipeline Access", async () => {
    const service = new DashboardService(prismaMock());
    await expect(
      service.authorizeFilters("org-a", consultant, { pipelineId: "pipeline-b" }, ["pipeline-a"]),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects selecting another consultant", async () => {
    const prisma = prismaMock();
    prisma.user.count.mockResolvedValue(0);
    const service = new DashboardService(prisma);
    await expect(
      service.authorizeFilters("org-a", consultant, { ownerId: "user-b" }, ["pipeline-a"]),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
