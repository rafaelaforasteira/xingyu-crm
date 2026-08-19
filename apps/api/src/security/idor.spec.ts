import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuthRole, UserStatus } from "@xingyu/database";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";

function consultant(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "consultant-a",
    name: "Ana",
    email: "ana@org-a.local",
    role: AuthRole.CONSULTANT,
    status: UserStatus.ACTIVE,
    organizationId: "org-a",
    teamId: "team-a",
    sessionId: "sess-a",
    ...overrides,
  };
}

function prismaMock() {
  return {
    $queryRaw: jest.fn().mockResolvedValue([{ id: "pipeline-a" }]),
    deal: { findFirst: jest.fn() },
    conversation: { findFirst: jest.fn() },
    task: { findFirst: jest.fn() },
    note: { findFirst: jest.fn() },
    activity: { findFirst: jest.fn() },
    order: { findFirst: jest.fn() },
    pipeline: { findFirst: jest.fn() },
    user: { findMany: jest.fn() },
  } as any;
}

describe("IDOR — orders and deals by direct ID", () => {
  it("blocks consultant A from GET/PATCH-equivalent access to consultant B's order", async () => {
    const prisma = prismaMock();
    prisma.order.findFirst.mockResolvedValue({
      ownerId: "consultant-b",
      operationalAssigneeId: "consultant-b",
      deal: { ownerId: "consultant-b", pipelineId: "pipeline-a" },
    });
    const service = new PipelineAccessService(prisma);

    await expect(service.assertOrderAccess(consultant(), "order-b")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("does not return another organization's order (404, not the payload)", async () => {
    const prisma = prismaMock();
    prisma.order.findFirst.mockResolvedValue(null);
    const service = new PipelineAccessService(prisma);

    await expect(service.assertOrderAccess(consultant(), "order-org-b")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("allows consultant A to access their own order", async () => {
    const prisma = prismaMock();
    prisma.order.findFirst
      .mockResolvedValueOnce({
        ownerId: "consultant-a",
        operationalAssigneeId: null,
        deal: { ownerId: "consultant-a", pipelineId: "pipeline-a" },
      })
      .mockResolvedValueOnce({
        deal: { pipelineId: "pipeline-a" },
      });
    const service = new PipelineAccessService(prisma);

    await expect(service.assertOrderAccess(consultant(), "order-a")).resolves.toBeUndefined();
  });

  it("blocks consultant A from another consultant's deal even in the same org", async () => {
    const prisma = prismaMock();
    prisma.deal.findFirst.mockResolvedValue({
      pipelineId: "pipeline-a",
      ownerId: "consultant-b",
    });
    const service = new PipelineAccessService(prisma);

    await expect(service.assertDealAccess(consultant(), "deal-b")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("does not leak a deal from organization B", async () => {
    const prisma = prismaMock();
    prisma.deal.findFirst.mockResolvedValue(null);
    const service = new PipelineAccessService(prisma);

    await expect(
      service.assertDealAccess(consultant({ organizationId: "org-a" }), "deal-org-b"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
