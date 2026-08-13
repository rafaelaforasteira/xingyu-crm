import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "./pipeline-access.service";

const user = {
  id: "user-a",
  organizationId: "org-a",
  role: "CONSULTANT",
  teamId: "team-a",
} as AuthenticatedUser;

function prismaMock() {
  return {
    $queryRaw: jest.fn(),
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

describe("PipelineAccessService security boundary", () => {
  it("keeps the ADMIN bypass without querying grants", async () => {
    const prisma = prismaMock();
    const service = new PipelineAccessService(prisma);
    expect(await service.accessiblePipelineIds({ ...user, role: "ADMIN" })).toBeNull();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("rejects a pipeline outside the effective union", async () => {
    const prisma = prismaMock();
    prisma.$queryRaw.mockResolvedValue([{ id: "pipeline-a" }]);
    const service = new PipelineAccessService(prisma);
    await expect(service.assertAccess(user, "pipeline-b")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it.each([
    ["deal", "assertDealAccess", { pipelineId: "pipeline-b" }],
    [
      "conversation",
      "assertConversationAccess",
      {
        channel: {
          accessMode: "PIPELINE",
          ownerUserId: null,
          pipelineConnections: [{ pipelineId: "pipeline-b" }],
        },
        deal: { pipelineId: "pipeline-b", ownerId: "user-b" },
      },
    ],
    ["task", "assertTaskAccess", { pipelineId: null, deal: { pipelineId: "pipeline-b" } }],
    ["note", "assertNoteAccess", { deal: { pipelineId: "pipeline-b" } }],
    [
      "activity",
      "assertActivityAccess",
      { deal: { pipelineId: "pipeline-b" }, task: null, order: null },
    ],
    ["order", "assertOrderAccess", { deal: { pipelineId: "pipeline-b" } }],
  ])("blocks %s IDOR by delegating to pipeline access", async (model, method, row) => {
    const prisma = prismaMock();
    prisma[model].findFirst.mockResolvedValue(row);
    prisma.$queryRaw.mockResolvedValue([{ id: "pipeline-a" }]);
    const service = new PipelineAccessService(prisma);
    await expect((service as any)[method](user, "resource-b")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("keeps a legitimate conversation without a Deal organization-scoped", async () => {
    const prisma = prismaMock();
    prisma.conversation.findFirst.mockResolvedValue({ deal: null });
    const service = new PipelineAccessService(prisma);
    await expect(
      service.assertConversationAccess(user, "conversation-free"),
    ).resolves.toBeUndefined();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("allows only the owner of a personal channel", async () => {
    const prisma = prismaMock();
    prisma.conversation.findFirst.mockResolvedValue({
      channel: { accessMode: "PERSONAL", ownerUserId: "user-b", pipelineConnections: [] },
      deal: null,
    });
    const service = new PipelineAccessService(prisma);
    await expect(
      service.assertConversationAccess(user, "conversation-personal"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    prisma.conversation.findFirst.mockResolvedValue({
      channel: { accessMode: "PERSONAL", ownerUserId: user.id, pipelineConnections: [] },
      deal: null,
    });
    await expect(
      service.assertConversationAccess(user, "conversation-personal"),
    ).resolves.toBeUndefined();
  });

  it("denies full deal access to a non-admin who is not the owner", async () => {
    const prisma = prismaMock();
    prisma.deal.findFirst.mockResolvedValue({ pipelineId: "pipeline-a", ownerId: "user-b" });
    prisma.$queryRaw.mockResolvedValue([{ id: "pipeline-a" }]);
    const service = new PipelineAccessService(prisma);
    await expect(service.assertDealAccess(user, "deal-b")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("keeps a task without Deal or Pipeline organization-scoped", async () => {
    const prisma = prismaMock();
    prisma.task.findFirst.mockResolvedValue({ pipelineId: null, deal: null });
    const service = new PipelineAccessService(prisma);
    await expect(service.assertTaskAccess(user, "task-free")).resolves.toBeUndefined();
  });
});
