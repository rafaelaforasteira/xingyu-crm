import { NotFoundException } from "@nestjs/common";
import { ActivitiesService } from "./activities.service";

describe("ActivitiesService lead timeline", () => {
  function setup(deal: { id: string } | null = { id: "deal-1" }) {
    const prisma = { deal: { findFirst: jest.fn().mockResolvedValue(deal) }, activity: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) } };
    return { prisma, service: new ActivitiesService(prisma as never) };
  }
  it("queries one organization-scoped newest-first page with actor included", async () => {
    const { prisma, service } = setup();
    await service.timeline("org-1", { dealId: "deal-1", page: 1, pageSize: 5 });
    expect(prisma.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", dealId: "deal-1" }), take: 5, orderBy: { createdAt: "desc" }, include: expect.objectContaining({ actor: expect.any(Object) }) }));
  });
  it("rejects a deal outside the organization", async () => {
    const { service } = setup(null);
    await expect(service.timeline("org-1", { dealId: "foreign" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("omits free-form titles, descriptions, and private metadata from the timeline DTO", async () => {
    const { prisma, service } = setup();
    prisma.activity.findMany.mockResolvedValue([
      {
        id: "activity-1",
        type: "NOTE_CREATED",
        title: "private note title",
        description: "private note body",
        createdAt: new Date(),
        actor: null,
        metadata: { noteId: "note-1", body: "secret" },
      },
    ]);
    prisma.activity.count.mockResolvedValue(1);
    const result = await service.timeline("org-1", { dealId: "deal-1" });
    expect(result.data[0]).toEqual(expect.objectContaining({ metadata: { noteId: "note-1" } }));
    expect(result.data[0]).not.toHaveProperty("title");
    expect(result.data[0]).not.toHaveProperty("description");
  });
});
